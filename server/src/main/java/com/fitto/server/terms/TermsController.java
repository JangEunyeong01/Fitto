package com.fitto.server.terms;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.AuthenticatedUser;
import com.fitto.server.auth.dto.SignupRequest;
import com.fitto.server.user.UserResponse;

import jakarta.validation.Valid;

/** 약관 버전과 다시 동의(명세 5-5). */
@RestController
public class TermsController {

	private final TermsPolicy termsPolicy;
	private final AgreementService agreementService;

	public TermsController(TermsPolicy termsPolicy, AgreementService agreementService) {
		this.termsPolicy = termsPolicy;
		this.agreementService = agreementService;
	}

	/** 지금 유효한 버전과 곧 시행될 버전. 로그인 없이 본다 — 게스트도 미리 알림을 볼 수 있게. */
	@GetMapping("/terms")
	public TermsResponse versions() {
		return new TermsResponse(termsPolicy.current(), termsPolicy.upcoming());
	}

	/** 바뀐 약관에 다시 동의. 가입 때와 같은 모양(셋 다 true + 버전)으로 받는다. */
	@PostMapping("/users/me/agreements")
	public UserResponse reconsent(@Valid @RequestBody SignupRequest.Agreements request) {
		return agreementService.reconsent(AuthenticatedUser.requireId(), request.version());
	}

	public record TermsResponse(String current, String upcoming) {
	}
}
