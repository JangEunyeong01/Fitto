package com.fitto.server.period.dto;

import java.time.LocalDate;

import com.fitto.server.period.PeriodLog;

import jakarta.validation.constraints.NotNull;

/** 생리 한 번. 끝날이 null이면 진행 중(명세 12장). 요청과 응답이 같은 모양이다. */
public record PeriodLogDto(@NotNull LocalDate startDate, LocalDate endDate) {

	public static PeriodLogDto from(PeriodLog log) {
		return new PeriodLogDto(log.getStartDate(), log.getEndDate());
	}
}
