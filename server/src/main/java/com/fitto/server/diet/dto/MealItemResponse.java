package com.fitto.server.diet.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.fitto.server.diet.MealItem;
import com.fitto.server.diet.MealType;
import com.fitto.server.diet.MealUnit;

/** 명세 7장 MealItem 리소스. */
public record MealItemResponse(
		String id,
		LocalDate date,
		MealType mealType,
		String name,
		String foodId,
		String recipeId,
		double amount,
		MealUnit unit,
		String servingLabel,
		int calories,
		Double carbs,
		Double protein,
		Double fat,
		Integer sodium,
		Double sugar,
		Instant createdAt,
		Instant updatedAt) {

	public static MealItemResponse from(MealItem item) {
		return new MealItemResponse(
				item.getId().toString(),
				item.getDate(),
				item.getMealType(),
				item.getName(),
				item.getFoodId(),
				item.getRecipeId() != null ? item.getRecipeId().toString() : null,
				item.getAmount(),
				item.getUnit(),
				item.getServingLabel(),
				item.getCalories(),
				item.getCarbs(),
				item.getProtein(),
				item.getFat(),
				item.getSodium(),
				item.getSugar(),
				item.getCreatedAt(),
				item.getUpdatedAt());
	}
}
