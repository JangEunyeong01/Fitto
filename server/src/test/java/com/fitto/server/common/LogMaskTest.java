package com.fitto.server.common;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

import org.junit.jupiter.api.Test;

/** 보안 로그에 이메일이 그대로 남지 않는지 확인한다. */
class LogMaskTest {

	@Test
	void 앞_두_글자만_남긴다() {
		assertEquals("ho***@fitto.app", LogMask.email("hong@fitto.app"));
		assertEquals("eu***@fitto.app", LogMask.email("eunyeong@fitto.app"));
	}

	@Test
	void 짧은_주소도_원문이_드러나지_않는다() {
		assertEquals("a***@fitto.app", LogMask.email("a@fitto.app"));
		assertEquals("ab***@fitto.app", LogMask.email("ab@fitto.app"));
	}

	@Test
	void 이메일_모양이_아니면_통째로_가린다() {
		// 무엇이 들어온 건지 알 수 없으므로 일부도 남기지 않는다.
		assertEquals("***", LogMask.email("Password123"));
	}

	@Test
	void 빈_값도_터지지_않는다() {
		assertEquals("(없음)", LogMask.email(null));
		assertEquals("(없음)", LogMask.email("  "));
	}

	@Test
	void 어떤_입력이든_원문_전체가_남지_않는다() {
		String email = "verylongaddress@fitto.app";
		assertFalse(LogMask.email(email).contains("verylongaddress"));
	}
}
