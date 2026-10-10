package com.fitto.server.terms;

import java.time.Instant;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.user.User;
import com.fitto.server.user.UserRepository;
import com.fitto.server.user.UserResponse;

/**
 * 약관 동의 기록. 가입과 다시 동의가 같은 길로 지나가야 이력이 빠지지 않는다.
 * 동의 시각은 앱이 보낸 값이 아니라 서버 시계로 찍는다(증거로 쓰려면 받는 쪽이 찍어야 한다).
 */
@Service
public class AgreementService {

	private final TermsPolicy termsPolicy;
	private final UserAgreementRepository agreementRepository;
	private final UserRepository userRepository;

	public AgreementService(TermsPolicy termsPolicy, UserAgreementRepository agreementRepository,
			UserRepository userRepository) {
		this.termsPolicy = termsPolicy;
		this.agreementRepository = agreementRepository;
		this.userRepository = userRepository;
	}

	/** 가입 때. 옛 앱이 보낸 옛 버전도 받는다 — 가입한 뒤 앱이 다시 동의를 묻는다. 모르는 버전은 거절. */
	public void recordOnSignup(User user, String version) {
		if (!termsPolicy.isKnown(version)) {
			throw new ApiException(ErrorCode.TERMS_OUTDATED);
		}
		record(user, version);
	}

	/** 다시 동의. 지금 버전이나 곧 시행될 버전만 받는다. */
	@Transactional
	public UserResponse reconsent(UUID userId, String version) {
		if (!termsPolicy.isAcceptableForReconsent(version)) {
			throw new ApiException(ErrorCode.TERMS_OUTDATED);
		}
		User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
		record(user, version);
		return UserResponse.from(user);
	}

	private void record(User user, String version) {
		Instant now = Instant.now();
		user.recordAgreements(version, now);
		agreementRepository.save(UserAgreement.of(user.getId(), version, now));
	}
}
