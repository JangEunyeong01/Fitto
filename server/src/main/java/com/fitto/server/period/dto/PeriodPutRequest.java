package com.fitto.server.period.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * 주기 설정(명세 12장).
 * today를 함께 받는 이유는 서버가 사용자의 오늘을 모르기 때문이다(명세 0-1).
 */
public record PeriodPutRequest(
		@NotNull LocalDate startDate,
		@NotNull @Min(21) @Max(45) Integer cycleLength,
		@NotNull @Min(2) @Max(10) Integer periodLength,
		@NotNull LocalDate today) {
}
