package com.fitto.server.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * 같은 곳에서 계정을 무더기로 만드는 걸 막는다.
 *
 * 가입은 인증이 필요 없는 API라 아무나 부를 수 있다. 막지 않으면 계정 테이블이 쓰레기로 차고,
 * 가입 때마다 BCrypt 해싱이 돌아 CPU도 함께 먹는다.
 *
 * ponytail: LoginAttemptGuard와 같은 메모리 카운터다. 서버를 여러 대로 늘리면
 * 인스턴스마다 따로 세므로 한도가 느슨해진다. 그때 둘을 같이 Redis로 옮긴다.
 */
@Component
public class SignupThrottle {

	private static final int MAX_PER_WINDOW = 5;
	private static final Duration WINDOW = Duration.ofHours(1);

	private record Attempts(int count, Instant firstAt) {
	}

	private final Map<String, Attempts> byClient = new ConcurrentHashMap<>();

	public boolean isBlocked(String clientKey) {
		Attempts attempts = byClient.get(clientKey);
		if (attempts == null) {
			return false;
		}
		if (expired(attempts)) {
			byClient.remove(clientKey);
			return false;
		}
		return attempts.count() >= MAX_PER_WINDOW;
	}

	public void record(String clientKey) {
		byClient.compute(clientKey, (k, current) -> {
			if (current == null || expired(current)) {
				return new Attempts(1, Instant.now());
			}
			return new Attempts(current.count() + 1, current.firstAt());
		});
	}

	private static boolean expired(Attempts attempts) {
		return attempts.firstAt().plus(WINDOW).isBefore(Instant.now());
	}
}
