package com.fitto.server.period;

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
 * 실제로 입력한 생리 한 번(명세 12장). 끝날이 비어 있으면 진행 중이다.
 * 목록은 앱이 통째로 보내고 서버는 통째로 바꾼다 — 한 번에 하나씩 고치면 겹침 검사가 요청마다 어긋난다.
 */
@Entity
@Table(name = "period_logs", uniqueConstraints = @UniqueConstraint(name = "uk_period_logs",
		columnNames = { "user_id", "start_date" }))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PeriodLog {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private LocalDate startDate;

	private LocalDate endDate;

	public static PeriodLog create(UUID userId, LocalDate startDate, LocalDate endDate) {
		PeriodLog log = new PeriodLog();
		log.id = UUID.randomUUID();
		log.userId = userId;
		log.startDate = startDate;
		log.endDate = endDate;
		return log;
	}
}
