package com.fitto.server.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** 토큰 갱신·로그아웃 공통 요청(명세 4장). */
public record TokenRequest(@NotBlank String refreshToken) {
}
