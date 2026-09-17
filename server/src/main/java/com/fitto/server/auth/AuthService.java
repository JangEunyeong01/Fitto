package com.fitto.server.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

	public AuthService(UserRepository userRepository, RefreshTokenRepository refreshTokenRepository,
			PasswordEncoder passwordEncoder, JwtTokenProvider tokenProvider, UserGoalService userGoalService,
			LoginAttemptGuard loginAttemptGuard) {
		this.userRepository = userRepository;
		this.refreshTokenRepository = refreshTokenRepository;
		this.passwordEncoder = passwordEncoder;
		this.tokenProvider = tokenProvider;
		this.userGoalService = userGoalService;
		this.loginAttemptGuard = loginAttemptGuard;
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
				p.activityLevel(), p.goal(), p.personality(), p.birthdayMonth(), p.birthdayDay());
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
			revokeAll(saved.getUserId());
			throw new ApiException(ErrorCode.REFRESH_TOKEN_REUSED);
		}
		if (!saved.isUsable(Instant.now())) {
			throw new ApiException(ErrorCode.REFRESH_TOKEN_INVALID);
		}

		saved.markUsed();
		return new TokenResponse(tokenProvider.createAccessToken(userId), issueRefreshToken(userId));
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

	private void revokeAll(UUID userId) {
		refreshTokenRepository.findAllByUserIdAndRevokedAtIsNull(userId).forEach(RefreshToken::revoke);
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
