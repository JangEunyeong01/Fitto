package com.fitto.server.period;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** 그날의 컨디션·증상·복용약·메모(명세 12장). 날짜당 한 건이고 통째로 덮어쓴다. */
@Entity
@Table(name = "period_daily", uniqueConstraints = @UniqueConstraint(name = "uk_period_daily",
		columnNames = { "user_id", "date" }))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PeriodDaily {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private LocalDate date;

	@Enumerated(EnumType.STRING)
	@Column(length = 10)
	private PeriodCondition condition;

	@ElementCollection
	@CollectionTable(name = "period_daily_symptoms", joinColumns = @JoinColumn(name = "period_daily_id"))
	@Column(name = "code", length = 30)
	private List<String> symptoms = new ArrayList<>();

	@Column(length = 50)
	private String medication;

	@Column(length = 200)
	private String memo;

	public static PeriodDaily create(UUID userId, LocalDate date) {
		PeriodDaily daily = new PeriodDaily();
		daily.id = UUID.randomUUID();
		daily.userId = userId;
		daily.date = date;
		return daily;
	}

	public void change(PeriodCondition condition, List<String> symptoms, String medication, String memo) {
		this.condition = condition;
		this.medication = medication;
		this.memo = memo;
		// JPA가 추적 중인 컬렉션은 통째로 갈아끼우면 예외가 난다. 내용만 교체한다.
		this.symptoms.clear();
		if (symptoms != null) {
			this.symptoms.addAll(symptoms);
		}
	}
}
