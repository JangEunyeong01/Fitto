package com.fitto.server.diet.dto;

import com.fitto.server.diet.MealType;
import com.fitto.server.diet.MealUnit;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

/**
 * 음식 기록 수정(명세 7장). 양이나 끼니만 바꾼다 — 음식 자체를 바꾸려면 지우고 다시 추가한다.
 * 보내지 않은 필드는 그대로 둔다.
 */
public record MealItemPatchRequest(
		MealType mealType,
		@DecimalMin("0.1") @DecimalMax("2000") Double amount,
		MealUnit unit) {
}
