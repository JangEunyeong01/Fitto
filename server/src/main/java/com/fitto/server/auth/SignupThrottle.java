package com.fitto.server.auth;

import java.time.Duration;

import org.springframework.stereotype.Component;

/**
 * 같은 곳에서 계정을 무더기로 만드는 걸 막는다.
 *
 * 가입은 인증이 필요 없는 API라 아무나 부를 수 있다. 막지 않으면 계정 테이블이 쓰레기로 차고,
 * 가입 때마다 BCrypt 해싱이 돌아 CPU도 함께 먹는다.
 *
 * 가입 응답이 "이미 가입된 이메일"과 "가입 성공"으로 갈리므로, 이 제한이 곧
 * **이메일 가입 여부를 훑는 것**에 대한 방어이기도 하다.
 */
@Component
public class SignupThrottle {

	private final AttemptCounter counter = new AttemptCounter(5, Duration.ofHours(1));

	public boolean isBlocked(String clientIp) {
		return counter.isBlocked(clientIp);
	}

	public void record(String clientIp) {
		counter.record(clientIp);
	}
}
