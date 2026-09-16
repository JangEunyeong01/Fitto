package com.fitto.server.workout;

import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 루틴에 담긴 운동 한 줄. */
@Entity
@Table(name = "routine_exercises")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RoutineExercise {

	@Id
	private UUID id;

	@Column(length = 30)
	private String exerciseCode;

	@Column(nullable = false, length = 30)
	private String name;

	@Column(nullable = false)
	private int duration;

	public static RoutineExercise create(String exerciseCode, String name, int duration) {
		RoutineExercise exercise = new RoutineExercise();
		exercise.id = UUID.randomUUID();
		exercise.exerciseCode = exerciseCode;
		exercise.name = name;
		exercise.duration = duration;
		return exercise;
	}
}
