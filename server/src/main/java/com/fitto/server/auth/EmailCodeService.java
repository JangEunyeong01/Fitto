package com.fitto.server.auth;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.user.User;
import com.fitto.server.user.UserRepository;

/**
 * 6자리 코드 발급·확인. 비밀번호 찾기와 이메일 인증이 같이 쓴다.
 *
 * 코드 방식을 고른 이유: 링크 방식은 누르면 앱으로 돌아오게 하는 딥링크와 받아줄 웹 페이지가 따로 필요하다.
 * 코드는 메일 앱에서 보고 피또에 옮겨 치면 끝이다.
 */
@Service
public class EmailCodeService {

	/** 메일함을 열고 옮겨 치기에 충분하고, 새어나가도 오래 쓰이지 못할 만큼. */
	static final Duration TTL = Duration.ofMinutes(10);

	/** 백만 개 중 다섯 번. 한 코드를 찍어 맞힐 확률은 0.0005%다. */
	static final int MAX_ATTEMPTS = 5;

	/** 메일을 연달아 보내는 걸 막는다. 메일 서비스 무료 한도를 한 사람이 다 쓰지 못하게. */
	static final Duration RESEND_GAP = Duration.ofSeconds(60);

	private final SecureRandom random = new SecureRandom();

	private final EmailCodeRepository codeRepository;
	private final UserRepository userRepository;
	private final PasswordEncoder passwordEncoder;
	private final MailSender mailSender;

	public EmailCodeService(EmailCodeRepository codeRepository, UserRepository userRepository,
			PasswordEncoder passwordEncoder, MailSender mailSender) {
		this.codeRepository = codeRepository;
		this.userRepository = userRepository;
		this.passwordEncoder = passwordEncoder;
		this.mailSender = mailSender;
	}

	/** 가입된 이메일이면 발급하고, 아니면 아무것도 하지 않는다. 비밀번호 찾기가 응답 뒤에서 부른다. */
	@Transactional
	public void issueIfRegistered(String email, EmailCode.Purpose purpose) {
		userRepository.findByEmail(email).ifPresent(user -> issue(user, purpose));
	}

	@Transactional
	public void issue(User user, EmailCode.Purpose purpose) {
		Instant now = Instant.now();
		codeRepository.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(user.getId(), purpose)
				.filter(latest -> latest.getCreatedAt().plus(RESEND_GAP).isAfter(now))
				.ifPresent(latest -> {
					throw new ApiException(ErrorCode.TOO_MANY_REQUESTS, "코드는 1분에 한 번 받을 수 있어요.");
				});

		// 새로 받으면 이전 코드는 쓸 수 없다. 메일함에 코드가 여러 개 있을 때 어느 게 맞는지 헷갈리지 않게.
		codeRepository.deleteAllByUserIdAndPurpose(user.getId(), purpose);

		String code = "%06d".formatted(random.nextInt(1_000_000));
		codeRepository.save(EmailCode.issue(user.getId(), purpose, passwordEncoder.encode(code), now.plus(TTL)));
		mailSender.sendCode(user.getEmail(), purpose, code);
	}

	/**
	 * 맞으면 코드를 지운다(한 번만 쓸 수 있다). 틀리면 횟수를 올리고 거절한다.
	 *
	 * 틀린 횟수는 거절하면서도 저장돼야 한다. 예외로 롤백되면 몇 번을 틀려도 0번으로 남아 한도가 의미 없어진다.
	 */
	@Transactional(noRollbackFor = ApiException.class)
	public void consume(UUID userId, EmailCode.Purpose purpose, String code) {
		EmailCode saved = codeRepository.findFirstByUserIdAndPurposeOrderByCreatedAtDesc(userId, purpose)
				.filter(c -> c.isUsable(Instant.now(), MAX_ATTEMPTS))
				.orElseThrow(() -> new ApiException(ErrorCode.CODE_INVALID));

		if (!passwordEncoder.matches(code, saved.getCodeHash())) {
			saved.recordFailure();
			throw new ApiException(ErrorCode.CODE_INVALID);
		}

		codeRepository.delete(saved);
	}
}
