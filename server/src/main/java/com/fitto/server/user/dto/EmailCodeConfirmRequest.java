package com.fitto.server.user.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

/** 이메일 인증 코드 확인(명세 5-4). */
public record EmailCodeConfirmRequest(
		@NotBlank @Pattern(regexp = "^\d{6}$", message = "코드는 숫자 6자리예요.") String code) {
}
