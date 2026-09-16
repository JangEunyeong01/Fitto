package com.fitto.server.workout.dto;

import java.util.List;

import com.fitto.server.workout.Routine;

public record RoutineResponse(String id, String name, List<Exercise> exercises, int totalDuration) {

	public record Exercise(String exerciseCode, String name, int duration) {
	}

	public static RoutineResponse from(Routine routine) {
		List<Exercise> exercises = routine.getExercises().stream()
				.map(e -> new Exercise(e.getExerciseCode(), e.getName(), e.getDuration()))
				.toList();

		return new RoutineResponse(
				routine.getId().toString(),
				routine.getName(),
				exercises,
				exercises.stream().mapToInt(Exercise::duration).sum());
	}
}
