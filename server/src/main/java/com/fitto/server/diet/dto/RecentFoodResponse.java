package com.fitto.server.diet.dto;

import com.fitto.server.diet.MealItem;
import com.fitto.server.diet.MealUnit;

/** 최근 먹은 음식(명세 7장). 다시 담을 때 쓰는 값만 담는다 — 날짜나 끼니는 이번 기록의 것을 쓴다. */
public record RecentFoodResponse(
		String name,
		String foodId,
		double amount,
		MealUnit unit,
		String servingLabel,
		int calories) {

	public static RecentFoodResponse from(MealItem item) {
		return new RecentFoodResponse(item.getName(), item.getFoodId(), item.getAmount(), item.getUnit(),
				item.getServingLabel(), item.getCalories());
	}
}
