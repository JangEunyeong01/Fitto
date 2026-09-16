package com.fitto.server.daily;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 하루 걸음수. 날짜당 한 건이고 절댓값으로 덮어쓴다(명세 10장).
 * 기기 센서가 주는 값이라 누적이 아니라 그 시점의 총합이 온다.
 */
@Entity
@Table(name = "daily_steps", uniqueConstraints = @UniqueConstraint(name = "uk_daily_steps",
		columnNames = { "user_id", "date" }))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DailySteps {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private LocalDate date;

	@Column(nullable = false)
	private int steps;

	public static DailySteps create(UUID userId, LocalDate date, int steps) {
		DailySteps entity = new DailySteps();
		entity.id = UUID.randomUUID();
		entity.userId = userId;
		entity.date = date;
		entity.steps = steps;
		return entity;
	}

	public void changeSteps(int steps) {
		this.steps = steps;
	}
}
