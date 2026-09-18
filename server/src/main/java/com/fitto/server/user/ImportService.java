package com.fitto.server.user;

import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.daily.DailySteps;
import com.fitto.server.daily.DailyStepsRepository;
import com.fitto.server.daily.DailyWater;
import com.fitto.server.daily.DailyWaterRepository;
import com.fitto.server.daily.WeightLog;
import com.fitto.server.daily.WeightLogRepository;
import com.fitto.server.diet.CustomIngredient;
import com.fitto.server.diet.CustomIngredientRepository;
import com.fitto.server.diet.MealItem;
import com.fitto.server.diet.MealItemRepository;
import com.fitto.server.diet.MealMemoRepository;
import com.fitto.server.diet.Recipe;
import com.fitto.server.diet.RecipeIngredient;
import com.fitto.server.diet.RecipeRepository;
import com.fitto.server.period.PeriodDaily;
import com.fitto.server.period.PeriodDailyRepository;
import com.fitto.server.period.PeriodSetting;
import com.fitto.server.period.PeriodSettingRepository;
import com.fitto.server.user.dto.ImportRequest;
import com.fitto.server.user.dto.ImportResult;
import com.fitto.server.workout.Routine;
import com.fitto.server.workout.RoutineExercise;
import com.fitto.server.workout.RoutineRepository;
import com.fitto.server.workout.Workout;
import com.fitto.server.workout.WorkoutRepository;

/**
 * 게스트 기록을 계정으로 옮긴다(명세 6장).
 *
 * 합치기 규칙은 두 가지다.
 * - ID가 있는 기록(식단·운동): 같은 ID가 서버에 있으면 건너뛴다
 * - 날짜당 하나인 기록(수분·걸음수·체중·메모·컨디션): 서버에 그 날짜 값이 있으면 서버 값을 유지한다
 *
 * 둘 다 "서버 값을 이긴다"는 원칙이다. 다른 기기에서 이미 기록한 값을,
 * 오래 방치된 이 기기의 값으로 덮어쓰는 쪽이 더 큰 사고다.
 *
 * 칼로리는 다시 계산하지 않는다. 게스트로 쓸 때 본 숫자가 가입했다고 달라지면 사용자는 오류로 본다.
 */
@Service
public class ImportService {

	private static final String[] KEYS = {
			"meals", "mealMemos", "workouts", "water", "steps", "weights", "periodDaily",
			"recipes", "routines", "customIngredients" };

	private final UserRepository userRepository;
	private final MealItemRepository mealItemRepository;
	private final MealMemoRepository mealMemoRepository;
	private final WorkoutRepository workoutRepository;
	private final DailyWaterRepository waterRepository;
	private final DailyStepsRepository stepsRepository;
	private final WeightLogRepository weightRepository;
	private final PeriodSettingRepository periodSettingRepository;
	private final PeriodDailyRepository periodDailyRepository;
	private final RecipeRepository recipeRepository;
	private final RoutineRepository routineRepository;
	private final CustomIngredientRepository customIngredientRepository;

	public ImportService(UserRepository userRepository, MealItemRepository mealItemRepository,
			MealMemoRepository mealMemoRepository, WorkoutRepository workoutRepository,
			DailyWaterRepository waterRepository, DailyStepsRepository stepsRepository,
			WeightLogRepository weightRepository, PeriodSettingRepository periodSettingRepository,
			PeriodDailyRepository periodDailyRepository, RecipeRepository recipeRepository,
			RoutineRepository routineRepository, CustomIngredientRepository customIngredientRepository) {
		this.userRepository = userRepository;
		this.mealItemRepository = mealItemRepository;
		this.mealMemoRepository = mealMemoRepository;
		this.workoutRepository = workoutRepository;
		this.waterRepository = waterRepository;
		this.stepsRepository = stepsRepository;
		this.weightRepository = weightRepository;
		this.periodSettingRepository = periodSettingRepository;
		this.periodDailyRepository = periodDailyRepository;
		this.recipeRepository = recipeRepository;
		this.routineRepository = routineRepository;
		this.customIngredientRepository = customIngredientRepository;
	}

	/** 전체가 한 트랜잭션이다. 중간에 실패하면 아무것도 저장되지 않는다(명세 6장). */
	@Transactional
	public ImportResult importAll(UUID userId, ImportRequest request) {
		User user = userRepository.findById(userId)
				.orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));

		ImportResult.Counter counter = new ImportResult.Counter();

		// 레시피를 식단보다 먼저 넣는다. 식단이 레시피를 가리키는데, 아직 없는 레시피를 가리키면
		// 남의 것인지 아닌지 확인할 수가 없다.
		importRecipes(userId, request.recipes(), counter);
		importRoutines(userId, request.routines(), counter);
		importCustomIngredients(userId, request.customIngredients(), counter);
		importMeals(userId, request.meals(), counter);
		importMealMemos(userId, request.mealMemos(), counter);
		importWorkouts(userId, request.workouts(), counter);
		importWater(userId, request.water(), counter);
		importSteps(userId, request.steps(), counter);
		importWeights(userId, request.weights(), counter);
		importPeriod(userId, request.period(), counter);

		return counter.toResult(UserResponse.from(user), KEYS);
	}

	private void importMeals(UUID userId, List<ImportRequest.Meal> meals, ImportResult.Counter counter) {
		if (meals == null) {
			return;
		}
		for (ImportRequest.Meal meal : meals) {
			if (meal.id() != null && mealItemRepository.existsById(meal.id())) {
				counter.skipped("meals");
				continue;
			}

			MealItem item = MealItem.create(meal.id(), userId, meal.date(), meal.mealType(), meal.name());
			// 남의 레시피를 가리키면 출처만 지우고 기록은 살린다.
			UUID recipeId = meal.recipeId() != null
					&& recipeRepository.existsByIdAndUserId(meal.recipeId(), userId) ? meal.recipeId() : null;
			item.changeSource(meal.foodId(), recipeId);
			item.changeAmount(meal.amount(), meal.unit(), meal.servingLabel());
			item.changeNutrition(meal.calories(), meal.carbs(), meal.protein(), meal.fat(), meal.sodium(),
					meal.sugar());

			mealItemRepository.save(item);
			counter.imported("meals");
		}
	}

	private void importMealMemos(UUID userId, List<ImportRequest.MealMemo> memos, ImportResult.Counter counter) {
		if (memos == null) {
			return;
		}
		for (ImportRequest.MealMemo memo : memos) {
			boolean exists = mealMemoRepository
					.findByUserIdAndDateAndMealType(userId, memo.date(), memo.mealType()).isPresent();
			if (exists) {
				counter.skipped("mealMemos");
				continue;
			}
			mealMemoRepository.save(
					com.fitto.server.diet.MealMemo.create(userId, memo.date(), memo.mealType(), memo.memo()));
			counter.imported("mealMemos");
		}
	}

	private void importWorkouts(UUID userId, List<ImportRequest.Workout> workouts, ImportResult.Counter counter) {
		if (workouts == null) {
			return;
		}
		for (ImportRequest.Workout w : workouts) {
			if (w.id() != null && workoutRepository.existsById(w.id())) {
				counter.skipped("workouts");
				continue;
			}

			Workout workout = Workout.create(w.id(), userId, w.date(), w.name());
			workout.change(w.exerciseCode(), w.name(), w.duration(), w.calories(), w.memo(), null);
			workoutRepository.save(workout);
			counter.imported("workouts");
		}
	}

	private void importWater(UUID userId, List<ImportRequest.Water> items, ImportResult.Counter counter) {
		if (items == null) {
			return;
		}
		for (ImportRequest.Water item : items) {
			if (waterRepository.findByUserIdAndDate(userId, item.date()).isPresent()) {
				counter.skipped("water");
				continue;
			}
			waterRepository.save(DailyWater.create(userId, item.date(), item.amount()));
			counter.imported("water");
		}
	}

	private void importSteps(UUID userId, List<ImportRequest.Steps> items, ImportResult.Counter counter) {
		if (items == null) {
			return;
		}
		for (ImportRequest.Steps item : items) {
			if (stepsRepository.findByUserIdAndDate(userId, item.date()).isPresent()) {
				counter.skipped("steps");
				continue;
			}
			stepsRepository.save(DailySteps.create(userId, item.date(), item.steps()));
			counter.imported("steps");
		}
	}

	private void importWeights(UUID userId, List<ImportRequest.Weight> items, ImportResult.Counter counter) {
		if (items == null) {
			return;
		}
		for (ImportRequest.Weight item : items) {
			if (weightRepository.findByUserIdAndDate(userId, item.date()).isPresent()) {
				counter.skipped("weights");
				continue;
			}
			weightRepository.save(WeightLog.create(userId, item.date(), item.weight()));
			counter.imported("weights");
		}
	}

	private void importRecipes(UUID userId, List<ImportRequest.Recipe> recipes, ImportResult.Counter counter) {
		if (recipes == null) {
			return;
		}
		for (ImportRequest.Recipe r : recipes) {
			if (r.id() != null && recipeRepository.existsById(r.id())) {
				counter.skipped("recipes");
				continue;
			}

			Recipe recipe = Recipe.create(r.id(), userId, r.name());
			recipeRepository.save(recipe);
			recipe.replaceIngredients(r.ingredients().stream()
					.map(i -> RecipeIngredient.create(i.name(), i.foodId(), i.customIngredientId(), i.amount(),
							i.calories(), i.carbs(), i.protein(), i.fat(), i.sodium(), i.sugar()))
					.toList());
			counter.imported("recipes");
		}
	}

	private void importRoutines(UUID userId, List<ImportRequest.Routine> routines, ImportResult.Counter counter) {
		if (routines == null) {
			return;
		}
		for (ImportRequest.Routine r : routines) {
			if (r.id() != null && routineRepository.existsById(r.id())) {
				counter.skipped("routines");
				continue;
			}

			Routine routine = Routine.create(r.id(), userId, r.name());
			routineRepository.save(routine);
			routine.replaceExercises(r.exercises().stream()
					.map(e -> RoutineExercise.create(e.exerciseCode(), e.name(), e.duration()))
					.toList());
			counter.imported("routines");
		}
	}

	/** 직접 입력 재료는 이름이 겹치면 건너뛴다(명세 6장). 이름이 사용자 안에서 유일해야 해서다. */
	private void importCustomIngredients(UUID userId, List<ImportRequest.CustomIngredient> ingredients,
			ImportResult.Counter counter) {
		if (ingredients == null) {
			return;
		}
		for (ImportRequest.CustomIngredient i : ingredients) {
			if (customIngredientRepository.findByUserIdAndName(userId, i.name()).isPresent()) {
				counter.skipped("customIngredients");
				continue;
			}

			CustomIngredient ingredient = CustomIngredient.create(i.id(), userId, i.name());
			ingredient.change(i.calories(), i.carbs(), i.protein(), i.fat(), i.sodium(), i.sugar(),
					Boolean.TRUE.equals(i.allergy()));
			customIngredientRepository.save(ingredient);
			counter.imported("customIngredients");
		}
	}

	private void importPeriod(UUID userId, ImportRequest.Period period, ImportResult.Counter counter) {
		if (period == null) {
			return;
		}

		// 주기 설정은 서버에 없을 때만 적용한다. 다른 기기에서 이미 맞춰둔 주기를 덮어쓰면 예측이 통째로 어긋난다.
		if (period.settings() != null && periodSettingRepository.findById(userId).isEmpty()) {
			periodSettingRepository.save(PeriodSetting.create(userId, period.settings().startDate(),
					period.settings().cycleLength(), period.settings().periodLength()));
		}

		if (period.daily() == null) {
			return;
		}
		for (ImportRequest.Period.Daily daily : period.daily()) {
			if (periodDailyRepository.findByUserIdAndDate(userId, daily.date()).isPresent()) {
				counter.skipped("periodDaily");
				continue;
			}

			PeriodDaily entity = PeriodDaily.create(userId, daily.date());
			entity.change(daily.condition(), daily.symptoms(), daily.medication(), daily.memo());
			periodDailyRepository.save(entity);
			counter.imported("periodDaily");
		}
	}
}
