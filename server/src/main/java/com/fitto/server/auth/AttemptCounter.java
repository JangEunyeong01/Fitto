package com.fitto.server.auth;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * "일정 시간 안에 몇 번까지" 를 세는 카운터.
 *
 * 로그인 실패·가입 시도처럼 같은 형태의 제한이 여러 곳에 필요해서 하나로 뺐다.
 * 따로 두면 한쪽만 고치는 일이 생긴다.
 *
 * 메모리에 센다. 서버를 여러 대로 늘리면 인스턴스마다 따로 세므로 한도가 느슨해지고 재시작하면 초기화된다.
 * 그때 Redis로 옮긴다 — 이 클래스만 바꾸면 쓰는 쪽은 그대로다.
 */
public class AttemptCounter {

	private record Attempts(int count, Instant firstAt) {
	}

	private final int max;
	private final Duration window;
	private final Map<String, Attempts> counts = new ConcurrentHashMap<>();

	public AttemptCounter(int max, Duration window) {
		this.max = max;
		this.window = window;
	}

	public boolean isBlocked(String key) {
		Attempts attempts = counts.get(key);
		if (attempts == null) {
			return false;
		}
		if (expired(attempts)) {
			counts.remove(key);
			return false;
		}
		return attempts.count() >= max;
	}

	public void record(String key) {
		counts.compute(key, (k, current) -> {
			if (current == null || expired(current)) {
				return new Attempts(1, Instant.now());
			}
			return new Attempts(current.count() + 1, current.firstAt());
		});
	}

	public void clear(String key) {
		counts.remove(key);
	}

	private boolean expired(Attempts attempts) {
		return attempts.firstAt().plus(window).isBefore(Instant.now());
	}
}
