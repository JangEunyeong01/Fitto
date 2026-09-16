package com.fitto.server.diet;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 레시피 재료 한 줄(명세 7장). amount는 g이다.
 * 영양소가 null인 것은 "정보 없음"이며 0과 구분한다(명세 0-5).
 */
@Entity
@Table(name = "recipe_ingredients")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RecipeIngredient {

	@Id
	private UUID id;

	@Column(nullable = false, length = 30)
	private String name;

	/** 식품 DB 코드. 직접 입력 재료에서 담았으면 customIngredientId 쪽이 채워진다. */
	@Column(length = 50)
	private String foodId;

	private UUID customIngredientId;

	@Column(nullable = false)
	private double amount;

	@Column(nullable = false)
	private int calories;

	private Double carbs;
	private Double protein;
	private Double fat;
	private Integer sodium;
	private Double sugar;

	public static RecipeIngredient create(String name, String foodId, UUID customIngredientId, double amount,
			int calories, Double carbs, Double protein, Double fat, Integer sodium, Double sugar) {
		RecipeIngredient ingredient = new RecipeIngredient();
		ingredient.id = UUID.randomUUID();
		ingredient.name = name;
		ingredient.foodId = foodId;
		ingredient.customIngredientId = customIngredientId;
		ingredient.amount = amount;
		ingredient.calories = calories;
		ingredient.carbs = carbs;
		ingredient.protein = protein;
		ingredient.fat = fat;
		ingredient.sodium = sodium;
		ingredient.sugar = sugar;
		return ingredient;
	}
}
