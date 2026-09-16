package com.fitto.server.diet;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.DateGuard;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.diet.dto.CustomIngredientRequest;
import com.fitto.server.diet.dto.CustomIngredientResponse;
import com.fitto.server.diet.dto.MealItemResponse;
import com.fitto.server.diet.dto.RecipeRequest;
import com.fitto.server.diet.dto.RecipeResponse;
import com.fitto.server.diet.dto.RecipeUseRequest;

/** 레시피와 직접 입력 재료(명세 7장). */
@Service
public class RecipeService {

	private final RecipeRepository recipeRepository;
	private final CustomIngredientRepository customIngredientRepository;
	private final MealItemRepository mealItemRepository;
	private final DateGuard dateGuard;

	public RecipeService(RecipeRepository recipeRepository, CustomIngredientRepository customIngredientRepository,
			MealItemRepository mealItemRepository, DateGuard dateGuard) {
		this.recipeRepository = recipeRepository;
		this.customIngredientRepository = customIngredientRepository;
		this.mealItemRepository = mealItemRepository;
		this.dateGuard = dateGuard;
	}

	@Transactional(readOnly = true)
	public List<RecipeResponse> list(UUID userId) {
		return recipeRepository.findAllByUserIdOrderByCreatedAtDesc(userId).stream()
				.map(RecipeResponse::from)
				.toList();
	}

	@Transactional
	public RecipeResponse save(UUID userId, RecipeRequest request) {
		if (request.id() != null && recipeRepository.existsById(request.id())) {
			Recipe existing = recipeRepository.findByIdAndUserId(request.id(), userId)
					.orElseThrow(() -> new ApiException(ErrorCode.ID_CONFLICT));
			return apply(existing, request);
		}

		Recipe recipe = Recipe.create(request.id(), userId, request.name());
		recipeRepository.save(recipe);
		return apply(recipe, request);
	}

	@Transactional
	public RecipeResponse update(UUID userId, UUID recipeId, RecipeRequest request) {
		Recipe recipe = recipeRepository.findByIdAndUserId(recipeId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "레시피를 찾을 수 없어요."));
		return apply(recipe, request);
	}

	@Transactional
	public void delete(UUID userId, UUID recipeId) {
		Recipe recipe = recipeRepository.findByIdAndUserId(recipeId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "레시피를 찾을 수 없어요."));
		recipeRepository.delete(recipe);
	}

	/**
	 * 레시피를 식단에 담는다(F-025).
	 * 단위는 serving이고 양이 인분 수다 — 레시피는 "1인분"이 무엇인지 재료로 정의돼 있다.
	 */
	@Transactional
	public MealItemResponse use(UUID userId, UUID recipeId, RecipeUseRequest request) {
		dateGuard.checkNotFuture(request.date());

		Recipe recipe = recipeRepository.findByIdAndUserId(recipeId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "레시피를 찾을 수 없어요."));

		double servings = request.servings() != null ? request.servings() : 1;
		MealType mealType = request.mealType() != null ? request.mealType() : MealType.SNACK;
		RecipeResponse.Totals totals = RecipeResponse.from(recipe).totals();

		MealItem item = MealItem.create(request.id(), userId, request.date(), mealType, recipe.getName());
		item.changeSource(null, recipe.getId());
		item.changeAmount(servings, MealUnit.SERVING, recipe.getName());
		item.changeNutrition(
				(int) Math.round(totals.calories() * servings),
				scale(totals.carbs(), servings),
				scale(totals.protein(), servings),
				scale(totals.fat(), servings),
				totals.sodium() != null ? (int) Math.round(totals.sodium() * servings) : null,
				scale(totals.sugar(), servings));

		mealItemRepository.save(item);
		return MealItemResponse.from(item);
	}

	// ---------- 직접 입력 재료 ----------

	@Transactional(readOnly = true)
	public List<CustomIngredientResponse> listIngredients(UUID userId) {
		return customIngredientRepository.findAllByUserIdOrderByName(userId).stream()
				.map(CustomIngredientResponse::from)
				.toList();
	}

	/** 같은 이름이 있으면 덮어쓴다(명세 7장). 이름이 사용자 안에서 유일하다는 규칙이 여기서 지켜진다. */
	@Transactional
	public CustomIngredientResponse saveIngredient(UUID userId, CustomIngredientRequest request) {
		CustomIngredient ingredient = customIngredientRepository
				.findByUserIdAndName(userId, request.name())
				.orElseGet(() -> customIngredientRepository
						.save(CustomIngredient.create(request.id(), userId, request.name())));

		CustomIngredientRequest.Per100g per = request.per100g();
		ingredient.change(per.calories(), per.carbs(), per.protein(), per.fat(), per.sodium(), per.sugar(),
				Boolean.TRUE.equals(request.allergy()));

		return CustomIngredientResponse.from(ingredient);
	}

	@Transactional
	public void deleteIngredient(UUID userId, UUID ingredientId) {
		CustomIngredient ingredient = customIngredientRepository.findByIdAndUserId(ingredientId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "재료를 찾을 수 없어요."));
		customIngredientRepository.delete(ingredient);
	}

	private RecipeResponse apply(Recipe recipe, RecipeRequest request) {
		recipe.changeName(request.name());
		recipe.replaceIngredients(request.ingredients().stream()
				.map(i -> RecipeIngredient.create(i.name(), i.foodId(), i.customIngredientId(), i.amount(),
						i.calories(), i.carbs(), i.protein(), i.fat(), i.sodium(), i.sugar()))
				.toList());
		return RecipeResponse.from(recipe);
	}

	private static Double scale(Double value, double ratio) {
		return value != null ? Math.round(value * ratio * 10) / 10.0 : null;
	}
}
