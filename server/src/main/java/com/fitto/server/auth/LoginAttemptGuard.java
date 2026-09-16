package com.fitto.server.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * 같은 이메일로 비밀번호를 계속 찔러보는 걸 막는다(명세 4장: 5분에 10회 실패).
 *
 * ponytail: 메모리 카운터. 서버를 여러 대로 늘리면 인스턴스마다 따로 세므로 한도가 느슨해진다.
 * 그때는 Redis로 옮긴다. 지금은 단일 인스턴스라 이걸로 충분하다.
 */
@Component
public class LoginAttemptGuard {

	private static final int MAX_FAILURES = 10;
	private static final Duration WINDOW = Duration.ofMinutes(5);

	private record Attempts(int count, Instant firstAt) {
	}

	private final Map<String, Attempts> failures = new ConcurrentHashMap<>();

	public boolean isBlocked(String email) {
		Attempts attempts = failures.get(key(email));
		if (attempts == null) {
			return false;
		}
		if (expired(attempts)) {
			failures.remove(key(email));
			return false;
		}
		return attempts.count() >= MAX_FAILURES;
	}

	public void recordFailure(String email) {
		failures.compute(key(email), (k, current) -> {
			if (current == null || expired(current)) {
				return new Attempts(1, Instant.now());
			}
			return new Attempts(current.count() + 1, current.firstAt());
		});
	}

	public void clear(String email) {
		failures.remove(key(email));
	}

	private static boolean expired(Attempts attempts) {
		return attempts.firstAt().plus(WINDOW).isBefore(Instant.now());
	}

	// 대소문자만 바꿔가며 한도를 우회하지 못하게 한다.
	private static String key(String email) {
		return email.toLowerCase();
	}
}
