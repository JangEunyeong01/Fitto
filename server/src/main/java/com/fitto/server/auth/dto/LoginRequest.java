package com.fitto.server.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 로그인은 형식을 따지지 않는다. 이메일 모양이 아니라고 따로 알려주면 그것도 계정 확인 통로가 된다.
 * 길이만 가입 때와 같은 값으로 막는다(그보다 긴 값은 애초에 저장될 수 없다).
 */
public record LoginRequest(
		@NotBlank @Size(max = 254) String email,
		@NotBlank @Size(max = 64) String password) {
}
