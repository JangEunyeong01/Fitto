package com.fitto.server.diet.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.fitto.server.diet.MealType;
import com.fitto.server.diet.MealUnit;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 음식 기록 추가(명세 7장).
 *
 * id는 앱이 만들어 보낸다. 같은 id로 다시 오면 새로 만들지 않고 기존 기록을 돌려준다(멱등, 명세 0-2).
 * 양의 상세 범위(g은 2000 이하, serving은 10 이하)는 단위에 따라 달라서 서비스에서 확인한다.
 */
public record MealItemCreateRequest(
		UUID id,
		@NotNull LocalDate date,
		@NotNull MealType mealType,
		@NotBlank @Size(min = 1, max = 50) String name,
		@Size(max = 50) String foodId,
		UUID recipeId,
		@NotNull @DecimalMin("0.1") @DecimalMax("2000") Double amount,
		@NotNull MealUnit unit,
		@Size(max = 50) String servingLabel,
		@NotNull @Min(0) @Max(5000) Integer calories,
		Double carbs,
		Double protein,
		Double fat,
		Integer sodium,
		Double sugar) {
}
