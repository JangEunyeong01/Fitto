package com.fitto.server.diet;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.AuthenticatedUser;
import com.fitto.server.diet.dto.CustomIngredientRequest;
import com.fitto.server.diet.dto.CustomIngredientResponse;
import com.fitto.server.diet.dto.MealItemResponse;
import com.fitto.server.diet.dto.RecipeRequest;
import com.fitto.server.diet.dto.RecipeResponse;
import com.fitto.server.diet.dto.RecipeUseRequest;

import jakarta.validation.Valid;

/** 레시피와 직접 입력 재료(명세 7장). */
@RestController
public class RecipeController {

	private final RecipeService recipeService;

	public RecipeController(RecipeService recipeService) {
		this.recipeService = recipeService;
	}

	@GetMapping("/recipes")
	public Map<String, List<RecipeResponse>> list() {
		return Map.of("items", recipeService.list(AuthenticatedUser.requireId()));
	}

	@PostMapping("/recipes")
	public ResponseEntity<RecipeResponse> save(@Valid @RequestBody RecipeRequest request) {
		RecipeResponse saved = recipeService.save(AuthenticatedUser.requireId(), request);
		return ResponseEntity.status(HttpStatus.CREATED).body(saved);
	}

	@PatchMapping("/recipes/{recipeId}")
	public RecipeResponse update(@PathVariable UUID recipeId, @Valid @RequestBody RecipeRequest request) {
		return recipeService.update(AuthenticatedUser.requireId(), recipeId, request);
	}

	@DeleteMapping("/recipes/{recipeId}")
	public ResponseEntity<Void> delete(@PathVariable UUID recipeId) {
		recipeService.delete(AuthenticatedUser.requireId(), recipeId);
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/recipes/{recipeId}/use")
	public ResponseEntity<MealItemResponse> use(@PathVariable UUID recipeId,
			@Valid @RequestBody RecipeUseRequest request) {
		MealItemResponse item = recipeService.use(AuthenticatedUser.requireId(), recipeId, request);
		return ResponseEntity.status(HttpStatus.CREATED).body(item);
	}

	@GetMapping("/ingredients/custom")
	public Map<String, List<CustomIngredientResponse>> listIngredients() {
		return Map.of("items", recipeService.listIngredients(AuthenticatedUser.requireId()));
	}

	@PutMapping("/ingredients/custom")
	public CustomIngredientResponse saveIngredient(@Valid @RequestBody CustomIngredientRequest request) {
		return recipeService.saveIngredient(AuthenticatedUser.requireId(), request);
	}

	@DeleteMapping("/ingredients/custom/{ingredientId}")
	public ResponseEntity<Void> deleteIngredient(@PathVariable UUID ingredientId) {
		recipeService.deleteIngredient(AuthenticatedUser.requireId(), ingredientId);
		return ResponseEntity.noContent().build();
	}
}
