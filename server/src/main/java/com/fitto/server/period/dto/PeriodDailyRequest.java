package com.fitto.server.period.dto;

import java.util.List;

import com.fitto.server.period.PeriodCondition;

import jakarta.validation.constraints.Size;

/**
 * 날짜별 생리 기록 저장(명세 12장). 네 필드가 모두 비면 그 날짜 기록을 지운다.
 * symptoms에는 증상만이 아니라 앱의 기록 칩 코드가 모두 들어온다(mood.happy, mucus.creamy, custom.… 등).
 * condition은 예전 컨디션 3택으로, 앱은 이제 기분 칩을 쓰고 null을 보낸다.
 */
public record PeriodDailyRequest(
		PeriodCondition condition,
		@Size(max = 60) List<@Size(max = 30) String> symptoms,
		@Size(max = 50) String medication,
		@Size(max = 200) String memo) {

	public boolean isEmpty() {
		return condition == null
				&& (symptoms == null || symptoms.isEmpty())
				&& (medication == null || medication.isBlank())
				&& (memo == null || memo.isBlank());
	}
}
