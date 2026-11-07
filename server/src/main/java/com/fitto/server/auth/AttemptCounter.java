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
 *
 * 지난 기록은 1분에 한 번 쓸어낸다. 예전엔 같은 키를 다시 조회할 때만 지워서, 한 번 오고 다시 안 오는
 * IP·이메일이 끝없이 쌓였다. 512MB 서버라 키 개수에도 상한을 둔다.
 */
public class AttemptCounter {

	/** 키 개수 상한. 한 기록이 수백 바이트라 이만큼이면 수 MB다. */
	static final int DEFAULT_MAX_KEYS = 50_000;
	static final Duration DEFAULT_SWEEP_EVERY = Duration.ofMinutes(1);

	private record Attempts(int count, Instant firstAt) {
	}

	private final int max;
	private final Duration window;
	private final int maxKeys;
	private final Duration sweepEvery;
	private final Map<String, Attempts> counts = new ConcurrentHashMap<>();
	private volatile Instant lastSweep = Instant.now();

	public AttemptCounter(int max, Duration window) {
		this(max, window, DEFAULT_MAX_KEYS, DEFAULT_SWEEP_EVERY);
	}

	/** 테스트용. 상한과 쓸기 간격을 작게 줘서 확인한다. */
	AttemptCounter(int max, Duration window, int maxKeys, Duration sweepEvery) {
		this.max = max;
		this.window = window;
		this.maxKeys = maxKeys;
		this.sweepEvery = sweepEvery;
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
		sweepIfDue();
		// 상한에 닿으면 새 키는 세지 않는다. 이미 세던 키는 계속 센다.
		// ponytail: 키를 끝없이 바꿔 오는 공격(위조한 IP 헤더 등) 앞에선 새 키 제한이 풀린다(메모리를 지키는 쪽을 골랐다).
		// 이메일 기준 제한은 그대로라 한 계정 대입은 막힌다. 여러 대로 늘릴 때 Redis로 옮기면 함께 해결한다.
		if (counts.size() >= maxKeys && !counts.containsKey(key)) {
			return;
		}
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

	/** 테스트용. 지금 들고 있는 키 개수. */
	int size() {
		return counts.size();
	}

	/**
	 * 쓸 때가 됐으면 지난 기록을 한꺼번에 지운다. 매번 쓸면 요청마다 전체를 훑게 돼서 간격을 둔다.
	 * 두 요청이 동시에 들어와 둘 다 쓸어도 결과는 같아서 따로 잠그지 않는다.
	 */
	private void sweepIfDue() {
		Instant now = Instant.now();
		if (lastSweep.plus(sweepEvery).isAfter(now)) {
			return;
		}
		lastSweep = now;
		counts.values().removeIf(this::expired);
	}

	private boolean expired(Attempts attempts) {
		return attempts.firstAt().plus(window).isBefore(Instant.now());
	}
}
