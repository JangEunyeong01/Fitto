package com.fitto.server.workout;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.DateGuard;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.user.User;
import com.fitto.server.user.UserRepository;
import com.fitto.server.workout.dto.RoutineRequest;
import com.fitto.server.workout.dto.RoutineResponse;
import com.fitto.server.workout.dto.WorkoutResponse;

/** 나만의 루틴(명세 8장, F-035). */
@Service
public class RoutineService {

	private final RoutineRepository routineRepository;
	private final WorkoutRepository workoutRepository;
	private final UserRepository userRepository;
	private final ExerciseCatalog exerciseCatalog;
	private final DateGuard dateGuard;

	public RoutineService(RoutineRepository routineRepository, WorkoutRepository workoutRepository,
			UserRepository userRepository, ExerciseCatalog exerciseCatalog, DateGuard dateGuard) {
		this.routineRepository = routineRepository;
		this.workoutRepository = workoutRepository;
		this.userRepository = userRepository;
		this.exerciseCatalog = exerciseCatalog;
		this.dateGuard = dateGuard;
	}

	@Transactional(readOnly = true)
	public List<RoutineResponse> list(UUID userId) {
		return routineRepository.findAllByUserIdOrderByName(userId).stream()
				.map(RoutineResponse::from)
				.toList();
	}

	@Transactional
	public RoutineResponse save(UUID userId, RoutineRequest request) {
		if (request.id() != null && routineRepository.existsById(request.id())) {
			Routine existing = routineRepository.findByIdAndUserId(request.id(), userId)
					.orElseThrow(() -> new ApiException(ErrorCode.ID_CONFLICT));
			return apply(existing, request);
		}

		Routine routine = Routine.create(request.id(), userId, request.name());
		routineRepository.save(routine);
		return apply(routine, request);
	}

	@Transactional
	public RoutineResponse update(UUID userId, UUID routineId, RoutineRequest request) {
		Routine routine = routineRepository.findByIdAndUserId(routineId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "루틴을 찾을 수 없어요."));
		return apply(routine, request);
	}

	@Transactional
	public void delete(UUID userId, UUID routineId) {
		Routine routine = routineRepository.findByIdAndUserId(routineId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "루틴을 찾을 수 없어요."));
		routineRepository.delete(routine);
	}

	/**
	 * 루틴에 담긴 운동을 그날 기록으로 한 번에 만든다.
	 * 칼로리는 저장된 값이 아니라 지금 체중으로 계산한다 — 루틴은 "무엇을 얼마나"만 들고 있다.
	 */
	@Transactional
	public List<WorkoutResponse> use(UUID userId, UUID routineId, LocalDate date) {
		dateGuard.checkNotFuture(date);

		Routine routine = routineRepository.findByIdAndUserId(routineId, userId)
				.orElseThrow(() -> new ApiException(ErrorCode.NOT_FOUND, "루틴을 찾을 수 없어요."));

		User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
		if (user.getWeight() == null) {
			throw new ApiException(ErrorCode.INVALID_INPUT, "체중을 먼저 입력해 주세요. 소모 칼로리를 계산할 수 없어요.");
		}

		List<WorkoutResponse> created = new ArrayList<>();
		for (RoutineExercise exercise : routine.getExercises()) {
			// 0kcal로 저장하지 않는다. 루틴은 내장 운동 목록에서 고르게 돼 있어 코드가 없을 수 없고,
			// 그런데도 없다면 데이터가 깨진 것이니 조용히 0을 남기는 대신 알린다.
			int calories = exerciseCatalog.metOf(exercise.getExerciseCode())
					.map(met -> exerciseCatalog.calories(met, user.getWeight(), exercise.getDuration()))
					.orElseThrow(() -> new ApiException(ErrorCode.INVALID_INPUT,
							"'" + exercise.getName() + "'은 목록에 없는 운동이라 소모 칼로리를 계산할 수 없어요."));

			Workout workout = Workout.create(null, userId, date, exercise.getName());
			workout.change(exercise.getExerciseCode(), exercise.getName(), exercise.getDuration(), calories, null,
					routine.getId());
			workoutRepository.save(workout);
			created.add(WorkoutResponse.from(workout));
		}
		return created;
	}

	private RoutineResponse apply(Routine routine, RoutineRequest request) {
		routine.changeName(request.name());
		routine.replaceExercises(request.exercises().stream()
				.map(e -> RoutineExercise.create(e.exerciseCode(), e.name(), e.duration()))
				.toList());
		return RoutineResponse.from(routine);
	}
}
