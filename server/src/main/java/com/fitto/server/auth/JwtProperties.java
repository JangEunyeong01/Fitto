package com.fitto.server.auth;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * 토큰 설정(명세 0-4). secret은 환경변수로 받는다 — 저장소에 두지 않는다.
 *
 * @param secret     HS256 서명 키. 최소 32바이트여야 한다
 * @param accessTtl  accessToken 유효 기간 (기본 30분)
 * @param refreshTtl refreshToken 유효 기간 (기본 14일)
 */
@ConfigurationProperties(prefix = "fitto.jwt")
public record JwtProperties(String secret, Duration accessTtl, Duration refreshTtl) {
}
