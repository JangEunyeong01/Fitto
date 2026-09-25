package com.fitto.server.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.LogMask;

import com.fitto.server.auth.dto.AuthResponse;
import com.fitto.server.auth.dto.LoginRequest;
import com.fitto.server.auth.dto.SignupRequest;
import com.fitto.server.auth.dto.TokenResponse;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.user.User;
import com.fitto.server.user.UserGoalService;
import com.fitto.server.user.UserRepository;
import com.fitto.server.user.UserResponse;

@Service
public class AuthService {

	private static final Logger log = LoggerFactory.getLogger(AuthService.class);

	/**
	 * 계정이 없을 때 비교용으로 쓰는 더미 BCrypt 해시.
	 * 어떤 비밀번호와도 일치하지 않는 값이며, 비교에 걸리는 시간을 실제 계정과 맞추는 용도다.
	 */
	private static final String DUMMY_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

	private final UserRepository userRepository;
	private final RefreshTokenRepository refreshTokenRepository;
	private final PasswordEncoder passwordEncoder;
	private final JwtTokenProvider tokenProvider;
	private final UserGoalService userGoalService;
	private final LoginAttemptGuard loginAttemptGuard;
	private final EmailCodeService emailCodeService;

	/** 현재 비밀번호를 찍어보는 걸 막는다. 토큰이 있어야 부를 수 있으니 로그인보다 좁게 잡아도 된다. */
	private final AttemptCounter passwordAttempts = new AttemptCounter(5, Duration.ofMinutes(10));

	/**
	 * 코드로 재설정하는 시도. 이메일 기준과 IP 기준을 같이 센다(로그인과 같은 이유).
	 * 코드 하나당 5번은 EmailCode가 막고, 이건 코드를 새로 받아가며 계속 찍는 걸 막는다.
	 */
	private final AttemptCounter resetAttempts = new AttemptCounter(10, Duration.ofHours(1));

	public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
			PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider, UserGoalService userGoalService,
			LoginAttemptGuard loginAttemptGuard, EmailCodeService emailCodeService) {
		this.userRepository = userRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.passwordEncoder = passwordEncoder;
		this.tokenProvider = tokenProvider;
		this.userGoalService = userGoalService;
		this.loginAttemptGuard = loginAttemptGuard;
		this.emailCodeService = emailCodeService;
	}

	@Transactional
	public AuthResponse signup(SignupRequest request) {
		String email = request.email().toLowerCase();
		if (userRepository.existsByEmail(email)) {
			throw new ApiException(ErrorCode.EMAIL_DUPLICATED);
		}

		User user = User.create(email, passwordEncoder.encode(request.password()), request.profile().name());

		SignupRequest.Profile p = request.profile();
		user.applyProfile(p.name(), p.gender(), p.age(), p.height(), p.weight(), p.targetWeight(),
				p.activityLevel(), p.goal(), p.personality(), p.birthYear(), p.birthdayMonth(), p.birthdayDay());
		user.replaceTagLists(p.diseases(), p.customDiseases(), p.preferredFoods(), p.customPreferredFoods(),
				p.allergies(), p.customAllergies());

		// 게스트로 쓰던 기간을 이어받는다. 없으면 가입 시각(User.create의 기본값)을 그대로 둔다.
		if (request.startedAt() != null) {
			user.changeStartedAt(request.startedAt());
		}

		userGoalService.recalculate(user);
		userRepository.save(user);

		return new AuthResponse(UserResponse.from(user), tokenProvider.createAccessToken(user.getId()),
				issueRefreshToken(user.getId()));
	}

	@Transactional
	public AuthResponse login(LoginRequest request, String clientIp) {
		String email = request.email().toLowerCase();
		if (loginAttemptGuard.isBlocked(email, clientIp)) {
			log.warn("로그인 차단: email={} ip={}", LogMask.email(email), clientIp);
			throw new ApiException(ErrorCode.TOO_MANY_REQUESTS);
		}

		User user = userRepository.findByEmail(email).orElse(null);

		/*
		 * 계정이 없어도 비밀번호 비교를 수행한다.
		 *
		 * 응답 메시지를 같게 하는 것만으로는 부족하다. BCrypt는 일부러 느린 함수라(~100ms),
		 * 계정이 없을 때 비교를 건너뛰면 응답이 눈에 띄게 빨라진다. 시간을 재면 가입 여부가 드러난다.
		 * 존재하지 않는 계정에도 더미 해시와 비교시켜 걸리는 시간을 맞춘다.
		 */
		String hashToCompare = user != null ? user.getPassword() : DUMMY_HASH;
		boolean matched = passwordEncoder.matches(request.password(), hashToCompare);

		if (user == null || !matched) {
			loginAttemptGuard.recordFailure(email, clientIp);
			// 계정이 없었는지 비밀번호가 틀렸는지는 로그에도 적지 않는다. 로그가 유출되면 가입 여부가 드러난다.
			log.warn("로그인 실패: email={} ip={}", LogMask.email(email), clientIp);
			throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
		}

		loginAttemptGuard.clear(email);
		return new AuthResponse(UserResponse.from(user), tokenProvider.createAccessToken(user.getId()),
				issueRefreshToken(user.getId()));
	}

	/**
	 * 갱신할 때마다 새 refreshToken을 발급하고 쓴 토큰은 사용 처리한다(로테이션).
	 * 이미 쓴 토큰이 다시 오면 탈취로 보고 그 사용자의 토큰을 전부 폐기한다.
	 */
	@Transactional
	public TokenResponse refresh(String refreshToken) {
		UUID userId = tokenProvider.parseUserId(refreshToken, true);
		if (userId == null) {
			throw new ApiException(ErrorCode.REFRESH_TOKEN_INVALID);
		}

		RefreshToken saved = refreshTokenRepository.findByTokenHash(hash(refreshToken))
				.orElseThrow(() -> new ApiException(ErrorCode.REFRESH_TOKEN_INVALID));

		if (saved.getUsedAt() != null) {
			int revoked = refreshTokenRepository.revokeAllByUserId(saved.getUserId(), Instant.now());
			// 탈취가 의심되는 상황이다. 사용자는 갑자기 전부 로그아웃되므로 원인을 찾을 수 있어야 한다.
			log.warn("refreshToken 재사용 감지, 전체 세션 폐기: userId={} 폐기={}건", saved.getUserId(), revoked);
			throw new ApiException(ErrorCode.REFRESH_TOKEN_REUSED);
		}
		if (!saved.isUsable(Instant.now())) {
			throw new ApiException(ErrorCode.REFRESH_TOKEN_INVALID);
		}

		saved.markUsed();
		return new TokenResponse(tokenProvider.createAccessToken(userId), issueRefreshToken(userId));
	}

	/**
	 * 비밀번호 변경(명세 5장).
	 *
	 * 바꾸고 나면 그 계정의 refreshToken을 전부 폐기한다. 비밀번호를 바꾸는 이유 중 하나가
	 * "누가 내 계정을 쓰는 것 같다"인데, 남의 기기가 로그인된 채로 남으면 바꾼 의미가 없다.
	 * 대신 바꾼 기기는 새 토큰을 받아 그대로 쓴다 — 자기 자신까지 로그아웃시킬 이유는 없다.
	 */
	@Transactional
	public TokenResponse changePassword(UUID userId, String currentPassword, String newPassword) {
		if (passwordAttempts.isBlocked(userId.toString())) {
			log.warn("비밀번호 변경 차단: userId={}", userId);
			throw new ApiException(ErrorCode.TOO_MANY_REQUESTS);
		}

		User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));

		if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
			passwordAttempts.record(userId.toString());
			log.warn("비밀번호 변경 실패(현재 비밀번호 불일치): userId={}", userId);
			throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
		}

		passwordAttempts.clear(userId.toString());
		user.changePassword(passwordEncoder.encode(newPassword));

		// 폐기가 먼저다. 새로 발급한 토큰까지 같이 폐기되면 바꾼 기기도 로그아웃된다.
		int revoked = refreshTokenRepository.revokeAllByUserId(userId, Instant.now());
		log.info("비밀번호 변경: userId={} 폐기={}건", userId, revoked);

		return new TokenResponse(tokenProvider.createAccessToken(userId), issueRefreshToken(userId));
	}

	/**
	 * 비밀번호 찾기 코드 요청(명세 4-5).
	 *
	 * 가입 여부와 상관없이 같은 응답을 곧바로 돌려준다. 계정 찾기·코드 해싱(BCrypt)·메일 발송을 전부
	 * 응답 뒤로 미루는 이유는 **시간** 때문이다. 가입된 이메일일 때만 이 일들이 일어나면
	 * 응답이 수백 ms 늦어지고, 그걸 재면 가입 여부가 드러난다(로그인에서 더미 해시로 막은 것과 같은 문제).
	 *
	 * ponytail: 공용 스레드 풀에서 돈다. 서버가 여러 대가 되거나 메일이 밀리면 큐(메시지 브로커)로 옮긴다.
	 */
	public void requestPasswordReset(String email) {
		String normalized = email.toLowerCase();
		CompletableFuture.runAsync(() -> {
			try {
				emailCodeService.issueIfRegistered(normalized, EmailCode.Purpose.RESET_PASSWORD);
			} catch (ApiException e) {
				// 1분 안 재요청·메일 발송 불가. 응답은 이미 나갔으니 남기기만 한다.
				log.warn("비밀번호 찾기 코드 미발송: email={} 사유={}", LogMask.email(normalized), e.getErrorCode());
			} catch (RuntimeException e) {
				log.error("비밀번호 찾기 코드 발송 실패: email={} 예외={}", LogMask.email(normalized), e.getClass().getSimpleName());
			}
		});
	}

	/**
	 * 코드로 비밀번호 재설정(명세 4-5). 성공하면 바로 로그인된 상태로 돌려준다.
	 *
	 * 없는 계정·틀린 코드·만료된 코드를 같은 오류로 돌려준다. 계정이 없을 때도 더미 해시와 비교시켜 시간을 맞춘다.
	 * 재설정하면 모든 기기의 로그인을 끊는다 — 비밀번호를 찾는 이유 중 하나가 "누가 내 계정에 들어온 것 같다"라서.
	 * 메일함을 열어 코드를 맞힌 것이므로 이메일 인증도 된 것으로 본다.
	 */
	@Transactional(noRollbackFor = ApiException.class)
	public AuthResponse resetPassword(String email, String code, String newPassword, String clientIp) {
		String normalized = email.toLowerCase();
		if (resetAttempts.isBlocked(normalized) || resetAttempts.isBlocked(clientIp)) {
			log.warn("비밀번호 재설정 차단: email={} ip={}", LogMask.email(normalized), clientIp);
			throw new ApiException(ErrorCode.TOO_MANY_REQUESTS);
		}

		User user = userRepository.findByEmail(normalized).orElse(null);
		try {
			if (user == null) {
				passwordEncoder.matches(code, DUMMY_HASH);
				throw new ApiException(ErrorCode.CODE_INVALID);
			}
			emailCodeService.consume(user.getId(), EmailCode.Purpose.RESET_PASSWORD, code);
		} catch (ApiException e) {
			resetAttempts.record(normalized);
			resetAttempts.record(clientIp);
			log.warn("비밀번호 재설정 실패: email={} ip={}", LogMask.email(normalized), clientIp);
			throw e;
		}

		resetAttempts.clear(normalized);
		user.changePassword(passwordEncoder.encode(newPassword));
		user.markEmailVerified();
		int revoked = refreshTokenRepository.revokeAllByUserId(user.getId(), Instant.now());
		log.info("비밀번호 재설정: userId={} 폐기={}건", user.getId(), revoked);

		return new AuthResponse(UserResponse.from(user), tokenProvider.createAccessToken(user.getId()),
				issueRefreshToken(user.getId()));
	}

	/** 로그인한 사람의 이메일로 인증 코드를 보낸다(명세 5-4). 이미 인증됐으면 보내지 않는다. */
	@Transactional
	public void sendEmailVerification(UUID userId) {
		User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
		if (user.isEmailVerified()) {
			return;
		}
		emailCodeService.issue(user, EmailCode.Purpose.VERIFY_EMAIL);
	}

	@Transactional(noRollbackFor = ApiException.class)
	public UserResponse confirmEmailVerification(UUID userId, String code) {
		User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
		emailCodeService.consume(userId, EmailCode.Purpose.VERIFY_EMAIL, code);
		user.markEmailVerified();
		return UserResponse.from(user);
	}

	/** accessToken은 서버에 상태가 없어 만료까지 유효하다. 받은 refreshToken만 폐기한다(명세 4장). */
	@Transactional
	public void logout(String refreshToken) {
		refreshTokenRepository.findByTokenHash(hash(refreshToken)).ifPresent(RefreshToken::revoke);
	}

	private String issueRefreshToken(UUID userId) {
		String token = tokenProvider.createRefreshToken(userId);
		refreshTokenRepository.save(RefreshToken.issue(userId, hash(token), tokenProvider.refreshExpiresAt()));
		return token;
	}

	/**
	 * 토큰 원본 대신 해시를 저장한다. DB가 유출돼도 그 값으로는 갱신할 수 없다.
	 * 토큰은 이미 서명된 무작위 문자열이라 솔트 없는 SHA-256으로 충분하다(비밀번호와 달리 사전 공격 대상이 아니다).
	 */
	private static String hash(String token) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(token.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException e) {
			throw new IllegalStateException("SHA-256을 쓸 수 없습니다", e);
		}
	}
}
