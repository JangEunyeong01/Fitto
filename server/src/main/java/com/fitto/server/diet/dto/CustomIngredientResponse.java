package com.fitto.server.diet.dto;

import java.time.Instant;

import com.fitto.server.diet.CustomIngredient;

public record CustomIngredientResponse(
		String id,
		String name,
		Per100g per100g,
		boolean allergy,
		Instant updatedAt) {

	public record Per100g(int calories, Double carbs, Double protein, Double fat, Integer sodium, Double sugar) {
	}

	public static CustomIngredientResponse from(CustomIngredient ingredient) {
		return new CustomIngredientResponse(
				ingredient.getId().toString(),
				ingredient.getName(),
				new Per100g(ingredient.getCalories(), ingredient.getCarbs(), ingredient.getProtein(),
						ingredient.getFat(), ingredient.getSodium(), ingredient.getSugar()),
				ingredient.isAllergy(),
				ingredient.getUpdatedAt());
	}
}
