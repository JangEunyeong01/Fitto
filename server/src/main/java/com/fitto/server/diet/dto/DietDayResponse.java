package com.fitto.server.diet.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 날짜별 식단 조회(명세 7장).
 * 기록이 없는 날도 200으로 응답한다. 끼니 키는 항상 네 개가 다 있고, 값만 비어 있다 —
 * 앱이 "없는 키"와 "빈 끼니"를 구분하지 않아도 되게 하려는 것이다.
 */
public record DietDayResponse(
		LocalDate date,
		int totalCalories,
		Map<String, List<MealItemResponse>> meals,
		Map<String, String> memos) {
}
