package com.fitto.server.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 비밀번호 변경 요청(명세 5장).
 * 새 비밀번호 규칙은 가입(SignupRequest)과 같아야 한다 — 변경으로 더 약한 비밀번호를 넣을 수 있으면 규칙이 무의미하다.
 */
public record PasswordChangeRequest(
		@NotBlank String currentPassword,

		@NotBlank @Size(min = 8, max = 64)
		@Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "비밀번호는 영문과 숫자를 모두 포함해야 해요.")
		String newPassword) {
}
