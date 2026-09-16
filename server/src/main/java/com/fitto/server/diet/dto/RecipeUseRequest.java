package com.fitto.server.diet.dto;

import java.time.LocalDate;
import java.util.UUID;

import com.fitto.server.diet.MealType;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

/** 레시피로 식단 추가(명세 7장, F-025). */
public record RecipeUseRequest(
		UUID id,
		@NotNull LocalDate date,
		MealType mealType,
		@DecimalMin("0.1") @DecimalMax("10") Double servings) {
}
