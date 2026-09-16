package com.fitto.server.period.dto;

import java.util.List;

import com.fitto.server.period.PeriodCondition;

import jakarta.validation.constraints.Size;

/** 날짜별 컨디션 저장(명세 12장). 네 필드가 모두 비면 그 날짜 기록을 지운다. */
public record PeriodDailyRequest(
		PeriodCondition condition,
		List<@Size(max = 30) String> symptoms,
		@Size(max = 50) String medication,
		@Size(max = 200) String memo) {

	public boolean isEmpty() {
		return condition == null
				&& (symptoms == null || symptoms.isEmpty())
				&& (medication == null || medication.isBlank())
				&& (memo == null || memo.isBlank());
	}
}
