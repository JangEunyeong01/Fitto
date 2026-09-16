package com.fitto.server.diet;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 먹은 음식 한 건(명세 7장).
 *
 * id를 서버가 만들지 않고 앱이 만들어 보낸다(명세 0-2). 앱은 누르는 즉시 화면에 반영하고
 * 오프라인에서도 기록을 만들기 때문에, 클라이언트 ID를 그대로 쓰면 나중에 동기화할 때
 * 임시 ID를 바꿔치기할 필요가 없고 재시도로 같은 기록이 두 번 생기지 않는다.
 *
 * 영양소가 null인 것과 0인 것은 다르다 — "정보 없음"과 "0g"을 구분한다(명세 0-5).
 */
@Entity
@Table(name = "meal_items", indexes = @Index(name = "idx_meal_user_date", columnList = "user_id, date"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MealItem {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private LocalDate date;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private MealType mealType;

	@Column(nullable = false, length = 50)
	private String name;

	/** 식품 DB 코드. 있으면 서버가 칼로리를 계산한다(명세 2-4). 직접 입력이면 null. */
	@Column(length = 50)
	private String foodId;

	private UUID recipeId;

	@Column(nullable = false)
	private double amount;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 10)
	private MealUnit unit;

	/** unit이 serving일 때 1인분이 무엇인지("1공기 210g"). g으로 기록했으면 null. */
	@Column(length = 50)
	private String servingLabel;

	@Column(nullable = false)
	private int calories;

	private Double carbs;
	private Double protein;
	private Double fat;
	private Integer sodium;
	private Double sugar;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

	public static MealItem create(UUID id, UUID userId, LocalDate date, MealType mealType, String name) {
		MealItem item = new MealItem();
		item.id = id != null ? id : UUID.randomUUID();
		item.userId = userId;
		item.date = date;
		item.mealType = mealType;
		item.name = name;
		return item;
	}

	public void changeSource(String foodId, UUID recipeId) {
		this.foodId = foodId;
		this.recipeId = recipeId;
	}

	public void changeAmount(double amount, MealUnit unit, String servingLabel) {
		this.amount = amount;
		this.unit = unit;
		this.servingLabel = unit == MealUnit.SERVING ? servingLabel : null;
	}

	public void changeNutrition(int calories, Double carbs, Double protein, Double fat, Integer sodium, Double sugar) {
		this.calories = calories;
		this.carbs = carbs;
		this.protein = protein;
		this.fat = fat;
		this.sodium = sodium;
		this.sugar = sugar;
	}

	public void changeName(String name) {
		this.name = name;
	}

	public void changeMealType(MealType mealType) {
		this.mealType = mealType;
	}
}
