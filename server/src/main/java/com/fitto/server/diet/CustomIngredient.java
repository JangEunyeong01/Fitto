package com.fitto.server.diet;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 직접 입력한 재료(명세 7장). 100g당 영양성분을 저장한다.
 * 이름은 사용자 안에서 유일하다 — 같은 이름을 여러 번 적으면 어느 걸 담았는지 본인도 구분할 수 없다.
 */
@Entity
@Table(name = "custom_ingredients", uniqueConstraints = @UniqueConstraint(name = "uk_custom_ingredient_name",
		columnNames = { "user_id", "name" }))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CustomIngredient {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false, length = 30)
	private String name;

	@Column(nullable = false)
	private int calories;

	private Double carbs;
	private Double protein;
	private Double fat;
	private Integer sodium;
	private Double sugar;

	/** 사용자가 "못 먹는 재료"로 표시했는지. 레시피에 담을 때 앱이 경고를 띄운다. */
	@Column(nullable = false)
	private boolean allergy;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

	public static CustomIngredient create(UUID id, UUID userId, String name) {
		CustomIngredient ingredient = new CustomIngredient();
		ingredient.id = id != null ? id : UUID.randomUUID();
		ingredient.userId = userId;
		ingredient.name = name;
		return ingredient;
	}

	public void change(int calories, Double carbs, Double protein, Double fat, Integer sodium, Double sugar,
			boolean allergy) {
		this.calories = calories;
		this.carbs = carbs;
		this.protein = protein;
		this.fat = fat;
		this.sodium = sodium;
		this.sugar = sugar;
		this.allergy = allergy;
	}

	public void changeName(String name) {
		this.name = name;
	}
}
