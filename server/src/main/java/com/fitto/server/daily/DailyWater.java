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
 * 하루 수분 섭취량(ml). 날짜당 한 건이다.
 *
 * 누적으로 더하지 않고 절댓값으로 덮어쓴다(명세 9장). 앱이 오프라인에서 보낸 요청을 재시도할 때
 * 누적 방식이면 같은 250ml가 두 번 더해진다.
 */
@Entity
@Table(name = "daily_water", uniqueConstraints = @UniqueConstraint(name = "uk_daily_water",
		columnNames = { "user_id", "date" }))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DailyWater {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private LocalDate date;

	@Column(nullable = false)
	private int amount;

	public static DailyWater create(UUID userId, LocalDate date, int amount) {
		DailyWater water = new DailyWater();
		water.id = UUID.randomUUID();
		water.userId = userId;
		water.date = date;
		water.amount = amount;
		return water;
	}

	public void changeAmount(int amount) {
		this.amount = amount;
	}
}
