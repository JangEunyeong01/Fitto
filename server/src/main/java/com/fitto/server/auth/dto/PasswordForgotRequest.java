package com.fitto.server.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 비밀번호 찾기 코드 요청(명세 4-5). */
public record PasswordForgotRequest(@NotBlank @Email @Size(max = 254) String email) {
}
