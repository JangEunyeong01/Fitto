package com.fitto.server.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 코드로 비밀번호 재설정(명세 4-5).
 * 새 비밀번호 규칙은 가입과 같다 — 재설정으로 더 약한 비밀번호를 넣을 수 있으면 규칙이 무의미하다.
 */
public record PasswordResetRequest(
		@NotBlank @Email @Size(max = 254) String email,

		@NotBlank @Pattern(regexp = "^[0-9]{6}$", message = "코드는 숫자 6자리예요.")
		String code,

		@NotBlank @Size(min = 8, max = 64)
		@Pattern(regexp = "^(?=.*[A-Za-z])(?=.*[0-9]).+$", message = "비밀번호는 영문과 숫자를 모두 포함해야 해요.")
		String newPassword) {
}
