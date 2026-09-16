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
 * 체중 기록(kg). 날짜당 한 건이고, 하루에 여러 번 재면 마지막 값으로 덮어쓴다(명세 11장).
 *
 * 다른 일별 기록과 테이블을 나눈 이유는 "안 잰 날"이 정상이기 때문이다.
 * 한 테이블에 묶으면 물만 기록한 날에도 체중 행이 생겨, 추이를 그릴 때 빈 값을 걸러내야 한다.
 */
@Entity
@Table(name = "weight_logs", uniqueConstraints = @UniqueConstraint(name = "uk_weight_log",
		columnNames = { "user_id", "date" }))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WeightLog {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private LocalDate date;

	@Column(nullable = false)
	private double weight;

	public static WeightLog create(UUID userId, LocalDate date, double weight) {
		WeightLog log = new WeightLog();
		log.id = UUID.randomUUID();
		log.userId = userId;
		log.date = date;
		log.weight = weight;
		return log;
	}

	public void changeWeight(double weight) {
		this.weight = weight;
	}
}
