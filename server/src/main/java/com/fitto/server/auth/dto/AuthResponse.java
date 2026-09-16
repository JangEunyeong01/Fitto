package com.fitto.server.auth.dto;

import com.fitto.server.user.UserResponse;

/** 가입·로그인 응답(명세 4장). 앱이 응답만으로 프로필과 목표를 바로 채울 수 있게 User를 함께 준다. */
public record AuthResponse(UserResponse user, String accessToken, String refreshToken) {
}
