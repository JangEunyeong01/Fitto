package com.fitto.server.user.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.fitto.server.diet.MealType;
import com.fitto.server.diet.MealUnit;
import com.fitto.server.period.PeriodCondition;

import jakarta.validation.Valid;

/**
 * 게스트로 쌓은 기기 기록(명세 6장). 모든 배열은 선택이다.
 *
 * 앱의 src/api/mappers.ts가 만드는 모양과 1:1로 맞춰져 있다.
 */
public record ImportRequest(
		List<@Valid Meal> meals,
		List<@Valid MealMemo> mealMemos,
		List<@Valid Workout> workouts,
		List<@Valid Water> water,
		List<@Valid Steps> steps,
		List<@Valid Weight> weights,
		@Valid Period period,
		List<@Valid Recipe> recipes,
		List<@Valid Routine> routines,
		List<@Valid CustomIngredient> customIngredients) {

	public record Meal(
			UUID id, LocalDate date, MealType mealType, String name, String foodId, UUID recipeId,
			Double amount, MealUnit unit, String servingLabel, Integer calories,
			Double carbs, Double protein, Double fat, Integer sodium, Double sugar) {
	}

	public record MealMemo(LocalDate date, MealType mealType, String memo) {
	}

	public record Workout(
			UUID id, LocalDate date, String exerciseCode, String name, Integer duration, Integer calories,
			String memo) {
	}

	public record Water(LocalDate date, Integer amount) {
	}

	public record Steps(LocalDate date, Integer steps) {
	}

	public record Weight(LocalDate date, Double weight) {
	}

	public record Period(@Valid Settings settings, List<@Valid Daily> daily) {

		public record Settings(LocalDate startDate, Integer cycleLength, Integer periodLength) {
		}

		public record Daily(LocalDate date, PeriodCondition condition, List<String> symptoms, String medication,
				String memo) {
		}
	}

	public record Recipe(UUID id, String name, List<@Valid Ingredient> ingredients) {

		public record Ingredient(String name, String foodId, UUID customIngredientId, Double amount,
				Integer calories, Double carbs, Double protein, Double fat, Integer sodium, Double sugar) {
		}
	}

	public record Routine(UUID id, String name, List<@Valid RoutineExercise> exercises) {

		public record RoutineExercise(String exerciseCode, String name, Integer duration) {
		}
	}

	public record CustomIngredient(UUID id, String name, Integer calories, Double carbs, Double protein,
			Double fat, Integer sodium, Double sugar, Boolean allergy) {
	}
}
