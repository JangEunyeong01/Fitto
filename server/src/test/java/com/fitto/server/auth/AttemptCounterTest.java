package com.fitto.server.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
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
	void 다시_안_오는_키도_지난_기록은_쓸어서_지운다() throws InterruptedException {
		// 쓸기 간격 0: 기록할 때마다 지난 것을 쓴다.
		AttemptCounter counter = new AttemptCounter(1, Duration.ofMillis(50), 100, Duration.ZERO);

		counter.record("한 번 온 IP 1");
		counter.record("한 번 온 IP 2");
		Thread.sleep(80);

		counter.record("새 IP");
		assertEquals(1, counter.size(), "창이 지난 두 키는 아무도 다시 조회하지 않아도 지워져야 한다");
	}

	@Test
	void 키가_상한에_닿으면_새_키는_세지_않고_세던_키는_계속_센다() {
		AttemptCounter counter = new AttemptCounter(2, Duration.ofMinutes(5), 2, Duration.ofMinutes(5));

		counter.record("a");
		counter.record("b");
		counter.record("c");
		assertEquals(2, counter.size(), "상한을 넘겨 쌓이면 안 된다");
		assertFalse(counter.isBlocked("c"));

		counter.record("a");
		assertTrue(counter.isBlocked("a"), "이미 세던 키는 상한과 상관없이 계속 센다");
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
