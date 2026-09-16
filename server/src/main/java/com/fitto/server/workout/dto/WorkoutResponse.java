package com.fitto.server.workout.dto;

import java.time.Instant;
import java.time.LocalDate;

import com.fitto.server.workout.Workout;

/** 명세 8장 Workout 리소스. */
public record WorkoutResponse(
		String id,
		LocalDate date,
		String exerciseCode,
		String name,
		int duration,
		int calories,
		String memo,
		String routineId,
		Instant createdAt,
		Instant updatedAt) {

	public static WorkoutResponse from(Workout workout) {
		return new WorkoutResponse(
				workout.getId().toString(),
				workout.getDate(),
				workout.getExerciseCode(),
				workout.getName(),
				workout.getDuration(),
				workout.getCalories(),
				workout.getMemo(),
				workout.getRoutineId() != null ? workout.getRoutineId().toString() : null,
				workout.getCreatedAt(),
				workout.getUpdatedAt());
	}
}
