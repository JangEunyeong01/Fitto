package com.fitto.server.auth;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.dto.AuthResponse;
import com.fitto.server.auth.dto.LoginRequest;
import com.fitto.server.auth.dto.SignupRequest;
import com.fitto.server.auth.dto.TokenRequest;
import com.fitto.server.auth.dto.TokenResponse;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;

/** 명세 4장. 이 세 개(+로그아웃)만 토큰 없이 부를 수 있다. */
@RestController
@RequestMapping("/auth")
public class AuthController {

	private final AuthService authService;
	private final SignupThrottle signupThrottle;

	public AuthController(AuthService authService, SignupThrottle signupThrottle) {
		this.authService = authService;
		this.signupThrottle = signupThrottle;
	}

	@PostMapping("/signup")
	public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request,
			HttpServletRequest httpRequest) {
		// 한 곳에서 계정을 무더기로 만드는 걸 막는다. 가입은 토큰 없이 부를 수 있는 API라 열려 있다.
		String clientKey = httpRequest.getRemoteAddr();
		if (signupThrottle.isBlocked(clientKey)) {
			throw new ApiException(ErrorCode.TOO_MANY_REQUESTS, "가입 시도가 너무 잦아요. 잠시 후 다시 시도해 주세요.");
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
