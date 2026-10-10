package com.fitto.server.terms;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Clock;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.List;

import org.junit.jupiter.api.Test;

/** 지금 버전·곧 시행될 버전은 날짜로 정해진다. 시행일 0시(한국 시각)가 경계. */
class TermsPolicyTest {

	private static final ZoneId KST = ZoneId.of("Asia/Seoul");
	private static final List<String> VERSIONS = List.of("2026-11-15", "2026-10-01", "2026-10-07");

	private static TermsPolicy at(String dateTime) {
		ZonedDateTime t = ZonedDateTime.parse(dateTime + "+09:00[Asia/Seoul]");
		return new TermsPolicy(VERSIONS, Clock.fixed(t.toInstant(), KST));
	}

	@Test
	void 시행일이_지난_것_중_가장_최근이_지금_버전() {
		TermsPolicy p = at("2026-10-10T12:00");
		assertEquals("2026-10-07", p.current());
		assertEquals("2026-11-15", p.upcoming());
	}

	@Test
	void 시행일_0시부터_새_버전() {
		assertEquals("2026-10-07", at("2026-11-14T23:59").current());
		assertEquals("2026-11-15", at("2026-11-15T00:00").current());
		assertNull(at("2026-11-15T00:00").upcoming());
	}

	@Test
	void 다시_동의는_지금이나_곧_시행될_버전만() {
		TermsPolicy p = at("2026-10-10T12:00");
		assertTrue(p.isAcceptableForReconsent("2026-10-07"));
		assertTrue(p.isAcceptableForReconsent("2026-11-15"));
		assertFalse(p.isAcceptableForReconsent("2026-10-01"), "옛 버전으로 되돌아가는 동의");
		assertFalse(p.isAcceptableForReconsent("2099-01-01"), "모르는 버전");
		assertFalse(p.isAcceptableForReconsent(null));
	}

	@Test
	void 가입은_목록에_있는_버전이면_받는다() {
		TermsPolicy p = at("2026-10-10T12:00");
		assertTrue(p.isKnown("2026-10-01"), "옛 앱으로 가입 — 받은 뒤 다시 동의를 묻는다");
		assertFalse(p.isKnown("2026-10-02"));
	}
}
