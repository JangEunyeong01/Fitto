package com.fitto.server.period;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 생리 주기 설정(명세 12장). 사용자당 하나.
 *
 * 이 행이 없으면 조회는 404 PERIOD_NOT_SET을 준다. 기본값으로 예측해서 돌려주면
 * 앱이 그 숫자를 사실처럼 보여주게 된다 — 입력한 적 없는 사람에게 "생리 5일차"가 뜨는 상황.
 */
@Entity
@Table(name = "period_settings")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PeriodSetting {

	/** 사용자당 하나라 사용자 ID를 그대로 기본키로 쓴다. */
	@Id
	@Column(name = "user_id")
	private UUID userId;

	@Column(nullable = false)
	private LocalDate startDate;

	@Column(nullable = false)
	private int cycleLength;

	@Column(nullable = false)
	private int periodLength;

	public static PeriodSetting create(UUID userId, LocalDate startDate, int cycleLength, int periodLength) {
		PeriodSetting setting = new PeriodSetting();
		setting.userId = userId;
		setting.startDate = startDate;
		setting.cycleLength = cycleLength;
		setting.periodLength = periodLength;
		return setting;
	}

	public void change(LocalDate startDate, int cycleLength, int periodLength) {
		this.startDate = startDate;
		this.cycleLength = cycleLength;
		this.periodLength = periodLength;
	}
}
