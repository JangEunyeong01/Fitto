package com.fitto.server.diet;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.DateGuard;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.diet.dto.DietDayResponse;
import com.fitto.server.diet.dto.MealItemCreateRequest;
import com.fitto.server.diet.dto.MealItemPatchRequest;
import com.fitto.server.diet.dto.MealItemResponse;
import com.fitto.server.diet.dto.MealMemoRequest;
import com.fitto.server.diet.dto.MealMemoResponse;
import com.fitto.server.diet.dto.RecentFoodResponse;

@Service
public class DietService {

	private static final double MAX_SERVING = 10;
	private static final double MAX_GRAM = 2000;

	private final MealItemRepository mealItemRepository;
	private final MealMemoRepository mealMemoRepository;
	private final RecipeRepository recipeRepository;
	private final DateGuard dateGuard;

	public DietService(MealItemRepository mealItemRepository, MealMemoRepository mealMemoRepository,
			RecipeRepository recipeRepository, DateGuard dateGuard) {
		this.mealItemRepository = mealItemRepository;
		this.mealMemoRepository = mealMemoRepository;
		this.recipeRepository = recipeRepository;
		this.dateGuard = dateGuard;
	}

	@Transactional(readOnly = true)
	public DietDayResponse getDay(UUID userId, LocalDate date) {
		List<MealItem> items = mealItemRepository.findAllByUserIdAndDateOrderByCreatedAt(userId, date);

		Map<String, List<MealItemResponse>> meals = new LinkedHashMap<>();
		Map<String, String> memos = new LinkedHashMap<>();
		for (MealType type : MealType.values()) {
			meals.put(type.toString(), new ArrayList<>());
			memos.put(type.toString(), null);
		}

		int total = 0;
		for (MealItem item : items) {
			meals.get(item.getMealType().toString()).add(MealItemResponse.from(item));
			total += item.getCalories();
		}

		mealMemoRepository.findAllByUserIdAndDate(userId, date)
				.forEach(memo -> memos.put(memo.getMealType().toString(), memo.getMemo()));

		return new DietDayResponse(date, total, meals, memos);
	}

	/**
	 * 음식 기록 추가. 이미 있는 id면 새로 만들지 않고 기존 기록을 돌려준다.
	 *
	 * @return 새로 만들었으면 true. 컨트롤러가 201과 200을 가른다
	 */
	@Transactional
	public Created<MealItemResponse> add(UUID userId, MealItemCreateRequest request) {
		dateGuard.checkNotFuture(request.date());
		checkAmount(request.amount(), request.unit());

		if (request.id() != null) {
			Optional<MealItem> existing = mealItemRepository.findById(request.id());
			if (existing.isPresent()) {
				MealItem item = existing.get();
				// 남의 기록과 같은 id를 들고 온 경우. 덮어쓰면 남의 기록이 바뀐다.
				if (!item.getUserId().equals(userId)) {
					throw new ApiException(ErrorCode.ID_CONFLICT);
				}
				return new Created<>(MealItemResponse.from(item), false);
			}
		}

		MealItem item = MealItem.create(request.id(), userId, request.date(), request.mealType(), request.name());
		item.changeSource(request.foodId(), ownRecipeId(userId, request.recipeId()));
		item.changeAmount(request.amount(), request.unit(), request.servingLabel());
		// TODO 식품 DB(명세 14장)를 붙이면 foodId가 있을 때 서버가 영양소를 계산한다.
		// 지금은 앱이 내장 음식 데이터로 계산한 값을 그대로 저장한다.
		item.changeNutrition(request.calories(), request.carbs(), request.protein(), request.fat(),
				request.sodium(), request.sugar());

		mealItemRepository.save(item);
		return new Created<>(MealItemResponse.from(item), true);
	}

	/**
	 * 이 기록이 어느 레시피에서 나왔는지 적어두는 값이다. 남의 레시피를 가리키면 지우고 저장한다.
	 * 레시피를 지운 뒤 밀린 기록이 올라오는 경우가 있어 거절하지는 않는다 — 기록은 살리고 출처만 비운다.
	 */
	private UUID ownRecipeId(UUID userId, UUID recipeId) {
		if (recipeId == null) {
			return null;
		}
		return recipeRepository.existsByIdAndUserId(recipeId, userId) ? recipeId : null;
	}

	@Transactional
	public MealItemResponse patch(UUID userId, UUID mealItemId, MealItemPatchRequest request) {
		MealItem item = mealItemRepository.findByIdAndUserId(mealItemId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "기록을 찾을 수 없어요."));

		if (request.mealType() != null) {
			item.changeMealType(request.mealType());
		}

		if (request.amount() != null) {
			MealUnit unit = request.unit() != null ? request.unit() : item.getUnit();
			checkAmount(request.amount(), unit);

			// 직접 입력한 음식은 그램 환산 정보가 없어 g ↔ 인분을 바꿔 계산할 수 없다(명세 7장).
			if (unit != item.getUnit() && item.getFoodId() == null) {
				throw new ApiException(ErrorCode.UNIT_CHANGE_NOT_ALLOWED);
			}

			double ratio = request.amount() / item.getAmount();
			item.changeAmount(request.amount(), unit, item.getServingLabel());
			item.changeNutrition(
					(int) Math.round(item.getCalories() * ratio),
					scale(item.getCarbs(), ratio),
					scale(item.getProtein(), ratio),
					scale(item.getFat(), ratio),
					item.getSodium() != null ? (int) Math.round(item.getSodium() * ratio) : null,
					scale(item.getSugar(), ratio));
		}

		return MealItemResponse.from(item);
	}

	@Transactional
	public void delete(UUID userId, UUID mealItemId) {
		MealItem item = mealItemRepository.findByIdAndUserId(mealItemId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "기록을 찾을 수 없어요."));
		mealItemRepository.delete(item);
	}

	@Transactional
	public MealMemoResponse putMemo(UUID userId, MealMemoRequest request) {
		dateGuard.checkNotFuture(request.date());

		String memo = request.memo() != null ? request.memo().trim() : null;
		Optional<MealMemo> existing = mealMemoRepository
				.findByUserIdAndDateAndMealType(userId, request.date(), request.mealType());

		// 빈 메모는 저장하지 않고 지운다. 빈 문자열 행이 남으면 조회할 때마다 걸러내야 한다.
		if (memo == null || memo.isEmpty()) {
			existing.ifPresent(mealMemoRepository::delete);
			return new MealMemoResponse(request.date(), request.mealType(), null);
		}

		MealMemo saved = existing.orElseGet(
				() -> mealMemoRepository.save(MealMemo.create(userId, request.date(), request.mealType(), memo)));
		saved.changeMemo(memo);

		return new MealMemoResponse(request.date(), request.mealType(), memo);
	}

	/** 이름 기준 중복 제거, 최근 순. 양은 마지막으로 기록한 값을 쓴다(명세 7장). */
	@Transactional(readOnly = true)
	public List<RecentFoodResponse> recentFoods(UUID userId, int limit) {
		Set<String> seen = new LinkedHashSet<>();
		List<RecentFoodResponse> result = new ArrayList<>();

		for (MealItem item : mealItemRepository.findTop50ByUserIdOrderByCreatedAtDesc(userId)) {
			if (seen.add(item.getName())) {
				result.add(RecentFoodResponse.from(item));
			}
			if (result.size() >= limit) {
				break;
			}
		}
		return result;
	}

	private static void checkAmount(double amount, MealUnit unit) {
		double max = unit == MealUnit.SERVING ? MAX_SERVING : MAX_GRAM;
		if (amount <= 0 || amount > max) {
			throw new ApiException(ErrorCode.INVALID_INPUT,
					unit == MealUnit.SERVING ? "인분은 0.1~10 사이로 적어주세요." : "그램은 0보다 크고 2000 이하로 적어주세요.");
		}
	}

	private static Double scale(Double value, double ratio) {
		return value != null ? Math.round(value * ratio * 10) / 10.0 : null;
	}

	/** 새로 만들었는지 여부를 함께 돌려주기 위한 묶음. 멱등 재요청은 201이 아니라 200이다. */
	public record Created<T>(T body, boolean created) {
	}
}
