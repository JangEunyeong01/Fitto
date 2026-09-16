package com.fitto.server.workout;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.DateGuard;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.user.User;
import com.fitto.server.user.UserRepository;
import com.fitto.server.workout.dto.WorkoutCreateRequest;
import com.fitto.server.workout.dto.WorkoutPatchRequest;
import com.fitto.server.workout.dto.WorkoutResponse;

@Service
public class WorkoutService {

	private final WorkoutRepository workoutRepository;
	private final UserRepository userRepository;
	private final ExerciseCatalog exerciseCatalog;
	private final DateGuard dateGuard;

	public WorkoutService(WorkoutRepository workoutRepository, UserRepository userRepository,
			ExerciseCatalog exerciseCatalog, DateGuard dateGuard) {
		this.workoutRepository = workoutRepository;
		this.userRepository = userRepository;
		this.exerciseCatalog = exerciseCatalog;
		this.dateGuard = dateGuard;
	}

	@Transactional(readOnly = true)
	public DayResult getDay(UUID userId, LocalDate date) {
		List<Workout> workouts = workoutRepository.findAllByUserIdAndDateOrderByCreatedAt(userId, date);

		int totalDuration = workouts.stream().mapToInt(Workout::getDuration).sum();
		int totalCalories = workouts.stream().mapToInt(Workout::getCalories).sum();

		return new DayResult(date, totalDuration, totalCalories,
				workouts.stream().map(WorkoutResponse::from).toList());
	}

	@Transactional
	public Created add(UUID userId, WorkoutCreateRequest request) {
		dateGuard.checkNotFuture(request.date());

		if (request.id() != null) {
			Optional<Workout> existing = workoutRepository.findById(request.id());
			if (existing.isPresent()) {
				Workout workout = existing.get();
				if (!workout.getUserId().equals(userId)) {
					throw new ApiException(ErrorCode.ID_CONFLICT);
				}
				return new Created(WorkoutResponse.from(workout), false);
			}
		}

		int calories = resolveCalories(userId, request.exerciseCode(), request.duration(), request.calories());

		Workout workout = Workout.create(request.id(), userId, request.date(), request.name());
		workout.change(request.exerciseCode(), request.name(), request.duration(), calories, request.memo(),
				request.routineId());

		workoutRepository.save(workout);
		return new Created(WorkoutResponse.from(workout), true);
	}

	@Transactional
	public WorkoutResponse patch(UUID userId, UUID workoutId, WorkoutPatchRequest request) {
		Workout workout = workoutRepository.findByIdAndUserId(workoutId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "기록을 찾을 수 없어요."));

		int duration = request.duration() != null ? request.duration() : workout.getDuration();
		String memo = request.memo() != null ? request.memo() : workout.getMemo();

		int calories;
		if (request.duration() != null && workout.getExerciseCode() != null) {
			// 시간이 바뀌면 내장 운동은 다시 계산한다. 그날 체중 기준이 아니라 현재 체중을 쓴다 —
			// 사용자가 방금 고친 기록이므로 지금 값으로 맞추는 편이 덜 어색하다.
			calories = resolveCalories(userId, workout.getExerciseCode(), duration, null);
		} else if (request.calories() != null) {
			calories = request.calories();
		} else {
			calories = workout.getCalories();
		}

		workout.change(workout.getExerciseCode(), workout.getName(), duration, calories, memo, workout.getRoutineId());
		return WorkoutResponse.from(workout);
	}

	@Transactional
	public void delete(UUID userId, UUID workoutId) {
		Workout workout = workoutRepository.findByIdAndUserId(workoutId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "기록을 찾을 수 없어요."));
		workoutRepository.delete(workout);
	}

	/**
	 * 내장 운동이면 MET로 계산하고, 목록에 없으면 요청 값을 그대로 쓴다(명세 2-3).
	 * 둘 다 없으면 계산할 근거가 없으므로 거절한다 — 0으로 저장하면 사용자가 0kcal을 사실로 믿는다.
	 */
	private int resolveCalories(UUID userId, String exerciseCode, int duration, Integer requested) {
		Optional<Double> met = exerciseCatalog.metOf(exerciseCode);
		if (met.isPresent()) {
			User user = userRepository.findById(userId)
					.orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
			// 체중을 아직 안 넣었으면 계산이 불가능하다. 이때는 앱이 보낸 값이 있으면 그걸 쓴다.
			if (user.getWeight() != null) {
				return exerciseCatalog.calories(met.get(), user.getWeight(), duration);
			}
		}

		if (requested == null) {
			throw new ApiException(ErrorCode.INVALID_INPUT, "소모 칼로리를 함께 보내주세요.");
		}
		return requested;
	}

	public record DayResult(LocalDate date, int totalDuration, int totalCalories, List<WorkoutResponse> workouts) {
	}

	public record Created(WorkoutResponse body, boolean created) {
	}
}
