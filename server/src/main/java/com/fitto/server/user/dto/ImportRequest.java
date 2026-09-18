package com.fitto.server.user.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import com.fitto.server.diet.MealType;
import com.fitto.server.diet.MealUnit;
import com.fitto.server.period.PeriodCondition;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 게스트로 쌓은 기기 기록(명세 6장). 모든 배열은 선택이다.
 *
 * 앱의 src/api/mappers.ts가 만드는 모양과 1:1로 맞춰져 있다.
 *
 * 제약은 개별 API(MealItemCreateRequest 등)와 같은 값으로 맞춘다. 여기만 느슨하면
 * 한 번에 넣는 통로로 우회가 된다. 배열 길이는 따로 막는다 — 한 요청이 서버를
 * 얼마나 오래 붙잡을 수 있는지가 여기서 정해진다.
 */
public record ImportRequest(
		@Size(max = MAX_RECORDS) List<@Valid Meal> meals,
		@Size(max = MAX_RECORDS) List<@Valid MealMemo> mealMemos,
		@Size(max = MAX_RECORDS) List<@Valid Workout> workouts,
		@Size(max = MAX_DAILY) List<@Valid Water> water,
		@Size(max = MAX_DAILY) List<@Valid Steps> steps,
		@Size(max = MAX_DAILY) List<@Valid Weight> weights,
		@Valid Period period,
		@Size(max = MAX_TEMPLATES) List<@Valid Recipe> recipes,
		@Size(max = MAX_TEMPLATES) List<@Valid Routine> routines,
		@Size(max = MAX_TEMPLATES) List<@Valid CustomIngredient> customIngredients) {

	/** 기록성 데이터. 하루 열 건씩 3년을 써도 닿지 않는 수치다. */
	private static final int MAX_RECORDS = 10000;

	/** 하루에 한 건인 것들(물·걸음·체중·주기). 10년치. */
	private static final int MAX_DAILY = 4000;

	/** 사용자가 직접 만드는 것들(레시피·루틴·직접 입력 재료). */
	private static final int MAX_TEMPLATES = 500;

	public record Meal(
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
			Double carbs, Double protein, Double fat, Integer sodium, Double sugar) {
	}

	public record MealMemo(
			@NotNull LocalDate date,
			@NotNull MealType mealType,
			@Size(max = 80) String memo) {
	}

	public record Workout(
			UUID id,
			@NotNull LocalDate date,
			@Size(max = 30) String exerciseCode,
			@NotBlank @Size(min = 1, max = 30) String name,
			@NotNull @Min(1) @Max(600) Integer duration,
			@Min(0) @Max(3000) Integer calories,
			@Size(max = 60) String memo) {
	}

	public record Water(
			@NotNull LocalDate date,
			@NotNull @Min(0) @Max(10000) Integer amount) {
	}

	public record Steps(
			@NotNull LocalDate date,
			@NotNull @Min(0) @Max(100000) Integer steps) {
	}

	public record Weight(
			@NotNull LocalDate date,
			@NotNull @DecimalMin("25") @DecimalMax("250") Double weight) {
	}

	public record Period(@Valid Settings settings, @Size(max = MAX_DAILY) List<@Valid Daily> daily) {

		public record Settings(
				@NotNull LocalDate startDate,
				@NotNull @Min(21) @Max(45) Integer cycleLength,
				@NotNull @Min(2) @Max(10) Integer periodLength) {
		}

		public record Daily(
				@NotNull LocalDate date,
				PeriodCondition condition,
				@Size(max = 20) List<@Size(max = 30) String> symptoms,
				@Size(max = 50) String medication,
				@Size(max = 200) String memo) {
		}
	}

	public record Recipe(
			UUID id,
			@NotBlank @Size(min = 1, max = 30) String name,
			@Size(max = 30) List<@Valid Ingredient> ingredients) {

		public record Ingredient(
				@NotBlank @Size(min = 1, max = 30) String name,
				@Size(max = 50) String foodId,
				UUID customIngredientId,
				@NotNull @DecimalMin("0.1") @DecimalMax("5000") Double amount,
				@NotNull @Min(0) @Max(5000) Integer calories,
				Double carbs, Double protein, Double fat, Integer sodium, Double sugar) {
		}
	}

	public record Routine(
			UUID id,
			@NotBlank @Size(min = 1, max = 30) String name,
			@Size(max = 8) List<@Valid RoutineExercise> exercises) {

		public record RoutineExercise(
				@Size(max = 30) String exerciseCode,
				@NotBlank @Size(min = 1, max = 30) String name,
				@NotNull @Min(1) @Max(600) Integer duration) {
		}
	}

	public record CustomIngredient(
			UUID id,
			@NotBlank @Size(min = 1, max = 30) String name,
			@NotNull @Min(0) @Max(900) Integer calories,
			Double carbs, Double protein, Double fat, Integer sodium, Double sugar,
			Boolean allergy) {
	}
}
