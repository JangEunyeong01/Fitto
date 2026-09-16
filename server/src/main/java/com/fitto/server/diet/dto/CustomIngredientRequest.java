package com.fitto.server.diet.dto;

import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 직접 입력 재료 저장(명세 7장). 같은 이름이 있으면 덮어쓴다. */
public record CustomIngredientRequest(
		UUID id,
		@NotBlank @Size(min = 1, max = 30) String name,
		@NotNull @Valid Per100g per100g,
		Boolean allergy) {

	public record Per100g(
			@NotNull @Min(0) @Max(900) Integer calories,
			Double carbs,
			Double protein,
			Double fat,
			Integer sodium,
			Double sugar) {
	}
}
