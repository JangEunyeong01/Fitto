package com.fitto.server.workout;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 운동 기록 한 건(명세 8장).
 *
 * exerciseCode가 있으면 서버가 MET로 칼로리를 계산하고, 없으면(목록에 없는 운동) 요청 값을 그대로 쓴다.
 * 이미 저장된 기록의 칼로리는 나중에 체중이 바뀌어도 다시 계산하지 않는다 — 그날 그 체중으로 한 운동이라서다.
 */
@Entity
@Table(name = "workouts", indexes = @Index(name = "idx_workout_user_date", columnList = "user_id, date"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Workout {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private LocalDate date;

	/** 내장 운동 목록의 코드. 직접 적은 운동이면 null. */
	@Column(length = 30)
	private String exerciseCode;

	/** 코드가 있어도 표시용으로 함께 저장한다. 목록에서 이름이 바뀌어도 그날 기록은 그대로 남는다. */
	@Column(nullable = false, length = 30)
	private String name;

	@Column(nullable = false)
	private int duration;

	@Column(nullable = false)
	private int calories;

	@Column(length = 60)
	private String memo;

	/** 루틴으로 추가했으면 그 루틴 ID. */
	private UUID routineId;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

	public static Workout create(UUID id, UUID userId, LocalDate date, String name) {
		Workout workout = new Workout();
		workout.id = id != null ? id : UUID.randomUUID();
		workout.userId = userId;
		workout.date = date;
		workout.name = name;
		return workout;
	}

	public void change(String exerciseCode, String name, int duration, int calories, String memo, UUID routineId) {
		this.exerciseCode = exerciseCode;
		this.name = name;
		this.duration = duration;
		this.calories = calories;
		this.memo = memo;
		this.routineId = routineId;
	}
}
