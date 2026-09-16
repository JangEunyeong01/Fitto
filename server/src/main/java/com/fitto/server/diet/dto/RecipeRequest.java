package com.fitto.server.diet.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 레시피 저장·수정(명세 7장). totals는 서버가 계산하므로 받지 않는다. */
public record RecipeRequest(
		UUID id,
		@NotBlank @Size(min = 1, max = 30) String name,
		@NotEmpty @Size(max = 30) List<@Valid Ingredient> ingredients) {

	public record Ingredient(
			@NotBlank @Size(min = 1, max = 30) String name,
			@Size(max = 50) String foodId,
			UUID customIngredientId,
			@NotNull @DecimalMin("0.1") @DecimalMax("5000") Double amount,
			@NotNull @Min(0) @Max(5000) Integer calories,
			Double carbs,
			Double protein,
			Double fat,
			Integer sodium,
			Double sugar) {
	}
}
