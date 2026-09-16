package com.fitto.server.workout;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 나만의 운동 루틴(명세 8장, F-035). 자주 하는 운동 묶음.
 *
 * 칼로리는 저장하지 않는다. 쓸 때마다 그 시점 체중으로 계산한다 —
 * 체중이 달라지면 같은 운동이라도 소모량이 달라지기 때문이다.
 */
@Entity
@Table(name = "routines", indexes = @Index(name = "idx_routine_user", columnList = "user_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Routine {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false, length = 30)
	private String name;

	@OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
	@JoinColumn(name = "routine_id", nullable = false)
	@OrderColumn(name = "position")
	private List<RoutineExercise> exercises = new ArrayList<>();

	public static Routine create(UUID id, UUID userId, String name) {
		Routine routine = new Routine();
		routine.id = id != null ? id : UUID.randomUUID();
		routine.userId = userId;
		routine.name = name;
		return routine;
	}

	public void changeName(String name) {
		this.name = name;
	}

	public void replaceExercises(List<RoutineExercise> next) {
		exercises.clear();
		exercises.addAll(next);
	}
}
