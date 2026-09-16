package com.fitto.server.auth.dto;

public record TokenResponse(String accessToken, String refreshToken) {
}
