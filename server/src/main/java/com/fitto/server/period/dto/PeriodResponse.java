package com.fitto.server.period.dto;

import java.time.LocalDate;

/** 주기 정보(명세 12장). 예정일들은 저장하지 않고 조회할 때마다 오늘 기준으로 계산한다. */
public record PeriodResponse(
		LocalDate startDate,
		int cycleLength,
		int periodLength,
		int cycleDay,
		LocalDate nextPeriod,
		LocalDate ovulation,
		LocalDate fertileStart,
		LocalDate fertileEnd) {
}
