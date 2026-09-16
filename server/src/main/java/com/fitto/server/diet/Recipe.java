package com.fitto.server.diet;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 내가 만든 레시피(명세 7장). 재료를 모아두고 한 번에 식단에 담는다.
 *
 * 사진은 서버에 올리지 않는다(v1.1). 기기 안 경로(file://)는 서버가 읽을 수 없고,
 * 이미지 업로드는 저장 용량·정리 정책까지 따라오는 일이라 2차로 미뤘다.
 */
@Entity
@Table(name = "recipes", indexes = @Index(name = "idx_recipe_user", columnList = "user_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Recipe {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false, length = 30)
	private String name;

	/**
	 * 재료는 레시피에 종속이라 cascade로 함께 저장·삭제한다.
	 * 순서를 저장하는 이유는 사용자가 적은 순서대로 보여줘야 해서다.
	 */
	@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
	@JoinColumn(name = "recipe_id", nullable = false)
	@OrderColumn(name = "position")
	private List<RecipeIngredient> ingredients = new ArrayList<>();

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

	public static Recipe create(UUID id, UUID userId, String name) {
		Recipe recipe = new Recipe();
		recipe.id = id != null ? id : UUID.randomUUID();
		recipe.userId = userId;
		recipe.name = name;
		return recipe;
	}

	public void changeName(String name) {
		this.name = name;
	}

	public void replaceIngredients(List<RecipeIngredient> next) {
		// 컬렉션 인스턴스를 갈아끼우면 orphanRemoval이 동작하지 않는다. 내용만 교체한다.
		ingredients.clear();
		ingredients.addAll(next);
	}
}
