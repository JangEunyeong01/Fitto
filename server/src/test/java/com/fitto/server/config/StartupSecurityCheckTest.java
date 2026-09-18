package com.fitto.server.config;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/**
 * 개발용 CORS 주소가 운영에 그대로 올라가는 걸 막는지 확인한다.
 *
 * 이 검사는 환경변수 값을 보는 것이라 코드 리뷰로는 걸리지 않는다. 그래서 테스트로 남긴다.
 * 서버를 prod로 띄워보는 수동 확인은 한 번 하면 끝나고, 다음 사람은 하지 않는다.
 */
class StartupSecurityCheckTest {

	@Test
	void 운영에서_전체_허용을_거부한다() {
		assertThrows(IllegalStateException.class, () -> StartupSecurityCheck.checkProdOrigins("*"));
	}

	@Test
	void 운영에서_개발용_주소를_거부한다() {
		IllegalStateException e = assertThrows(IllegalStateException.class,
				() -> StartupSecurityCheck.checkProdOrigins("http://localhost:5173"));
		// 어느 값이 문제인지 메시지에 들어가야 배포 중에 바로 고칠 수 있다.
		assertTrue(e.getMessage().contains("localhost:5173"));

		assertThrows(IllegalStateException.class, () -> StartupSecurityCheck.checkProdOrigins("http://127.0.0.1:8081"));
	}

	@Test
	void 여러_개_중_하나만_잘못돼도_거부한다() {
		assertThrows(IllegalStateException.class,
				() -> StartupSecurityCheck.checkProdOrigins("https://fitto.app, http://localhost:8081"));
	}

	@Test
	void 운영에서_평문_http를_거부한다() {
		assertThrows(IllegalStateException.class, () -> StartupSecurityCheck.checkProdOrigins("http://fitto.app"));
	}

	@Test
	void 정상적인_주소는_통과한다() {
		assertDoesNotThrow(() -> StartupSecurityCheck.checkProdOrigins("https://fitto.app"));
		assertDoesNotThrow(() -> StartupSecurityCheck.checkProdOrigins("https://fitto.app, https://www.fitto.app"));
	}
}
