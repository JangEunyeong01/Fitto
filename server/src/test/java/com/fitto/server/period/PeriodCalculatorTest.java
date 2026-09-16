package com.fitto.server.period;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.Test;

/**
 * 명세 2-5의 예시를 그대로 옮긴 테스트.
 * 앱(utils/periodCycle.ts)에도 같은 규칙이 있어서, 어긋나면 달력 색과 서버 예정일이 따로 논다.
 */
class PeriodCalculatorTest {

	private final PeriodCalculator calculator = new PeriodCalculator();

	// 명세 예시: startDate 2026-09-05, 주기 30일, 생리 기간 5일
	private final PeriodSetting setting = PeriodSetting.create(
			UUID.randomUUID(), LocalDate.of(2026, 9, 5), 30, 5);

	@Test
	void 명세_예시_다음_생리일과_배란일() {
		LocalDate today = LocalDate.of(2026, 9, 12);

		assertEquals(LocalDate.of(2026, 10, 5), calculator.nextPeriod(today, setting));
		assertEquals(LocalDate.of(2026, 9, 21), calculator.ovulation(today, setting));
		assertEquals(LocalDate.of(2026, 9, 16), calculator.fertileStart(today, setting));
	}

	@Test
	void 생리_기간은_시작일부터_periodLength일() {
		assertTrue(calculator.isPeriodDay(LocalDate.of(2026, 9, 5), setting));
		assertTrue(calculator.isPeriodDay(LocalDate.of(2026, 9, 9), setting));
		// 5일 기간이면 9/5~9/9까지다. 9/10은 아니다.
		assertFalse(calculator.isPeriodDay(LocalDate.of(2026, 9, 10), setting));
	}

	@Test
	void 오늘이_시작일이면_다음_예정일은_한_주기_뒤() {
		LocalDate today = LocalDate.of(2026, 9, 5);
		assertEquals(LocalDate.of(2026, 10, 5), calculator.nextPeriod(today, setting));
		assertEquals(1, calculator.cycleDay(today, setting));
	}

	@Test
	void 지난_주기에도_같은_규칙이_적용된다() {
		// 시작일보다 앞선 날짜도 주기를 거꾸로 반복해 계산한다.
		LocalDate lastCycle = LocalDate.of(2026, 8, 6); // 9/5에서 30일 전
		assertEquals(0, calculator.offset(lastCycle, setting.getStartDate(), setting.getCycleLength()));
		assertTrue(calculator.isPeriodDay(lastCycle, setting));
	}
}
