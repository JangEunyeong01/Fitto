package com.fitto.server.auth;

import java.time.Duration;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.dto.AuthResponse;
import com.fitto.server.auth.dto.LoginRequest;
import com.fitto.server.auth.dto.PasswordForgotRequest;
import com.fitto.server.auth.dto.PasswordResetRequest;
import com.fitto.server.auth.dto.SignupRequest;
import com.fitto.server.auth.dto.TokenRequest;
import com.fitto.server.auth.dto.TokenResponse;
import com.fitto.server.common.LogMask;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/** 명세 4장. 이 세 개(+로그아웃)만 토큰 없이 부를 수 있다. */
@RestController
@RequestMapping("/auth")
public class AuthController {

	private static final Logger log = LoggerFactory.getLogger(AuthController.class);

	private final AuthService authService;
	private final SignupThrottle signupThrottle;
	private final SignupAllowlist signupAllowlist;

	/**
	 * 비밀번호 찾기 요청 제한(IP 기준). 가입 여부와 상관없이 세므로 이 제한으로는 아무것도 새지 않는다.
	 * 막지 않으면 남의 이메일로 코드 메일을 무더기로 보내는 데 쓰일 수 있다.
	 */
	private final AttemptCounter forgotAttempts = new AttemptCounter(10, Duration.ofHours(1));

	public AuthController(AuthService authService, SignupThrottle signupThrottle, SignupAllowlist signupAllowlist) {
		this.authService = authService;
		this.signupThrottle = signupThrottle;
		this.signupAllowlist = signupAllowlist;
	}

	@PostMapping("/signup")
	public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request,
			HttpServletRequest httpRequest) {
		// 한 곳에서 계정을 무더기로 만드는 걸 막는다. 가입은 토큰 없이 부를 수 있는 API라 열려 있다.
		String clientKey = httpRequest.getRemoteAddr();
		if (signupThrottle.isBlocked(clientKey)) {
			log.warn("가입 차단: ip={}", clientKey);
			throw new ApiException(ErrorCode.TOO_MANY_REQUESTS, "가입 시도가 너무 잦아요. 잠시 후 다시 시도해 주세요.");
		}

		// 중복 확인보다 먼저 본다. 목록 밖의 사람이 "이미 가입된 이메일" 응답으로 가입 여부를 떠보지 못하게.
		// 거절도 시도 횟수에 넣는다 — 목록에 있는 이메일을 맞히려고 두드리는 것도 막아야 한다.
		if (!signupAllowlist.isAllowed(request.email())) {
			signupThrottle.record(clientKey);
			log.warn("가입 거절(허용 목록 밖): email={} ip={}", LogMask.email(request.email()), clientKey);
			throw new ApiException(ErrorCode.SIGNUP_CLOSED);
		}

		AuthResponse response = authService.signup(request);
		signupThrottle.record(clientKey);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@PostMapping("/login")
	public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest httpRequest) {
		// IP도 함께 넘긴다. 이메일 기준만으로는 계정을 바꿔가며 훑는 공격을 못 막는다.
		return authService.login(request, httpRequest.getRemoteAddr());
	}

	/** 가입 여부와 상관없이 항상 202. 코드 발급과 발송은 응답 뒤에서 한다(AuthService 참고). */
	@PostMapping("/password/forgot")
	public ResponseEntity<Void> forgotPassword(@Valid @RequestBody PasswordForgotRequest request,
			HttpServletRequest httpRequest) {
		String clientKey = httpRequest.getRemoteAddr();
		if (forgotAttempts.isBlocked(clientKey)) {
			log.warn("비밀번호 찾기 차단: ip={}", clientKey);
			throw new ApiException(ErrorCode.TOO_MANY_REQUESTS);
		}
		forgotAttempts.record(clientKey);
		authService.requestPasswordReset(request.email());
		return ResponseEntity.accepted().build();
	}

	@PostMapping("/password/reset")
	public AuthResponse resetPassword(@Valid @RequestBody PasswordResetRequest request,
			HttpServletRequest httpRequest) {
		return authService.resetPassword(request.email(), request.code(), request.newPassword(),
				httpRequest.getRemoteAddr());
	}

	@PostMapping("/refresh")
	public TokenResponse refresh(@Valid @RequestBody TokenRequest request) {
		return authService.refresh(request.refreshToken());
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(@Valid @RequestBody TokenRequest request) {
		authService.logout(request.refreshToken());
		return ResponseEntity.noContent().build();
	}
}
