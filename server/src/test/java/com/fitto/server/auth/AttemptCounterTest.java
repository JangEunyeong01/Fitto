package com.fitto.server.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;

import org.junit.jupiter.api.Test;

/**
 * 로그인 실패·가입·기록 쓰기 세 곳이 이 클래스에 기대고 있다.
 * 여기가 잘못되면 세 곳이 한꺼번에 뚫리므로 따로 확인한다.
 */
class AttemptCounterTest {

	@Test
	void 한도까지는_통과하고_넘으면_막는다() {
		AttemptCounter counter = new AttemptCounter(3, Duration.ofMinutes(5));

		for (int i = 0; i < 3; i++) {
			assertFalse(counter.isBlocked("a"), (i + 1) + "번째는 아직 막히면 안 된다");
			counter.record("a");
		}
		assertTrue(counter.isBlocked("a"));
	}

	@Test
	void 키가_다르면_따로_센다() {
		AttemptCounter counter = new AttemptCounter(1, Duration.ofMinutes(5));

		counter.record("a");
		assertTrue(counter.isBlocked("a"));
		assertFalse(counter.isBlocked("b"));
	}

	@Test
	void 시간이_지나면_다시_풀린다() throws InterruptedException {
		AttemptCounter counter = new AttemptCounter(1, Duration.ofMillis(50));

		counter.record("a");
		assertTrue(counter.isBlocked("a"));

		Thread.sleep(80);
		assertFalse(counter.isBlocked("a"), "창이 지나면 처음부터 다시 세야 한다");
	}

	@Test
	void 창이_지난_뒤의_기록은_처음부터_센다() throws InterruptedException {
		AttemptCounter counter = new AttemptCounter(2, Duration.ofMillis(50));

		counter.record("a");
		Thread.sleep(80);

		// 창이 끝났으므로 이 record는 1회차다. 2회가 되기 전까지는 막히지 않는다.
		counter.record("a");
		assertFalse(counter.isBlocked("a"));
	}

	@Test
	void 지우면_처음부터_센다() {
		AttemptCounter counter = new AttemptCounter(1, Duration.ofMinutes(5));

		counter.record("a");
		assertTrue(counter.isBlocked("a"));

		counter.clear("a");
		assertFalse(counter.isBlocked("a"));
	}
}
