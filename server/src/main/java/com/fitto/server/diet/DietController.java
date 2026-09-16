package com.fitto.server.diet;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.AuthenticatedUser;
import com.fitto.server.diet.dto.DietDayResponse;
import com.fitto.server.diet.dto.MealItemCreateRequest;
import com.fitto.server.diet.dto.MealItemPatchRequest;
import com.fitto.server.diet.dto.MealItemResponse;
import com.fitto.server.diet.dto.MealMemoRequest;
import com.fitto.server.diet.dto.MealMemoResponse;
import com.fitto.server.diet.dto.RecentFoodResponse;

import jakarta.validation.Valid;

/** 명세 7장. */
@RestController
@RequestMapping("/diet")
public class DietController {

	private static final int DEFAULT_RECENT_LIMIT = 10;
	private static final int MAX_RECENT_LIMIT = 20;

	private final DietService dietService;

	public DietController(DietService dietService) {
		this.dietService = dietService;
	}

	@GetMapping
	public DietDayResponse getDay(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return dietService.getDay(AuthenticatedUser.requireId(), date);
	}

	@PostMapping
	public ResponseEntity<MealItemResponse> add(@Valid @RequestBody MealItemCreateRequest request) {
		var result = dietService.add(AuthenticatedUser.requireId(), request);
		// 같은 id로 다시 온 요청은 새로 만든 게 아니므로 200으로 답한다(명세 0-2).
		return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.body());
	}

	@PatchMapping("/{mealItemId}")
	public MealItemResponse patch(@PathVariable UUID mealItemId, @Valid @RequestBody MealItemPatchRequest request) {
		return dietService.patch(AuthenticatedUser.requireId(), mealItemId, request);
	}

	@DeleteMapping("/{mealItemId}")
	public ResponseEntity<Void> delete(@PathVariable UUID mealItemId) {
		dietService.delete(AuthenticatedUser.requireId(), mealItemId);
		return ResponseEntity.noContent().build();
	}

	@PutMapping("/memo")
	public MealMemoResponse putMemo(@Valid @RequestBody MealMemoRequest request) {
		return dietService.putMemo(AuthenticatedUser.requireId(), request);
	}

	@GetMapping("/recent-foods")
	public Map<String, List<RecentFoodResponse>> recentFoods(
			@RequestParam(required = false) Integer limit) {
		int size = Math.min(limit != null ? limit : DEFAULT_RECENT_LIMIT, MAX_RECENT_LIMIT);
		// 목록 응답은 객체로 감싼다(명세 0-3). 최상위가 배열이면 나중에 필드를 못 붙인다.
		return Map.of("items", dietService.recentFoods(AuthenticatedUser.requireId(), size));
	}
}
