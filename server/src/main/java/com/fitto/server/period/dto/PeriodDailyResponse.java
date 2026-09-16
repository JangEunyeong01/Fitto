package com.fitto.server.period.dto;

import java.time.LocalDate;
import java.util.List;

import com.fitto.server.period.PeriodCondition;
import com.fitto.server.period.PeriodDaily;

public record PeriodDailyResponse(
		LocalDate date,
		PeriodCondition condition,
		List<String> symptoms,
		String medication,
		String memo) {

	public static PeriodDailyResponse from(PeriodDaily daily) {
		return new PeriodDailyResponse(daily.getDate(), daily.getCondition(), List.copyOf(daily.getSymptoms()),
				daily.getMedication(), daily.getMemo());
	}
}
