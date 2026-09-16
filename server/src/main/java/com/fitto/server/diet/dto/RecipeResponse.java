package com.fitto.server.diet.dto;

import java.time.Instant;
import java.util.List;

import com.fitto.server.diet.Recipe;
import com.fitto.server.diet.RecipeIngredient;

/** 명세 7장 Recipe 리소스. */
public record RecipeResponse(
		String id,
		String name,
		List<Ingredient> ingredients,
		Totals totals,
		Instant createdAt,
		Instant updatedAt) {

	public record Ingredient(
			String name, String foodId, String customIngredientId, double amount,
			int calories, Double carbs, Double protein, Double fat, Integer sodium, Double sugar) {

		static Ingredient from(RecipeIngredient i) {
			return new Ingredient(i.getName(), i.getFoodId(),
					i.getCustomIngredientId() != null ? i.getCustomIngredientId().toString() : null,
					i.getAmount(), i.getCalories(), i.getCarbs(), i.getProtein(), i.getFat(), i.getSodium(),
					i.getSugar());
		}
	}

	/**
	 * 재료 합계. 영양소가 없는 재료가 섞여 있으면 아는 값만 더하고,
	 * 그런 재료가 몇 개인지 함께 알려준다 — 앱이 "일부 재료 정보 없음"을 표시할 수 있게.
	 */
	public record Totals(
			int calories, Double carbs, Double protein, Double fat, Integer sodium, Double sugar,
			int unknownNutrientCount) {
	}

	public static RecipeResponse from(Recipe recipe) {
		List<RecipeIngredient> items = recipe.getIngredients();

		int calories = items.stream().mapToInt(RecipeIngredient::getCalories).sum();
		int unknown = (int) items.stream()
				.filter(i -> i.getCarbs() == null || i.getProtein() == null || i.getFat() == null)
				.count();

		Totals totals = new Totals(
				calories,
				sumDouble(items.stream().map(RecipeIngredient::getCarbs).toList()),
				sumDouble(items.stream().map(RecipeIngredient::getProtein).toList()),
				sumDouble(items.stream().map(RecipeIngredient::getFat).toList()),
				sumInt(items.stream().map(RecipeIngredient::getSodium).toList()),
				sumDouble(items.stream().map(RecipeIngredient::getSugar).toList()),
				unknown);

		return new RecipeResponse(
				recipe.getId().toString(),
				recipe.getName(),
				items.stream().map(Ingredient::from).toList(),
				totals,
				recipe.getCreatedAt(),
				recipe.getUpdatedAt());
	}

	/** 아는 값만 더한다. 전부 모르면 0이 아니라 null이다 — "0g"과 "정보 없음"은 다르다. */
	private static Double sumDouble(List<Double> values) {
		List<Double> known = values.stream().filter(v -> v != null).toList();
		if (known.isEmpty()) {
			return null;
		}
		double sum = known.stream().mapToDouble(Double::doubleValue).sum();
		return Math.round(sum * 10) / 10.0;
	}

	private static Integer sumInt(List<Integer> values) {
		List<Integer> known = values.stream().filter(v -> v != null).toList();
		return known.isEmpty() ? null : known.stream().mapToInt(Integer::intValue).sum();
	}
}
