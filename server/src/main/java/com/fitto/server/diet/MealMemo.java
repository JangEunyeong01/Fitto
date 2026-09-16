package com.fitto.server.diet;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 끼니 메모(명세 F-022). 날짜 + 끼니마다 하나다.
 *
 * v1.0에서는 음식 단위로 메모를 달게 돼 있었는데, 그러면 "오늘 아침" 전체에 대한 메모를 둘 데가 없었다.
 * v1.1에서 날짜+끼니 단위로 바꿨다.
 */
@Entity
@Table(name = "meal_memos", uniqueConstraints = @UniqueConstraint(name = "uk_meal_memo",
		columnNames = { "user_id", "date", "meal_type" }))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class MealMemo {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false)
	private LocalDate date;

	@Enumerated(EnumType.STRING)
	@Column(name = "meal_type", nullable = false, length = 20)
	private MealType mealType;

	@Column(nullable = false, length = 200)
	private String memo;

	public static MealMemo create(UUID userId, LocalDate date, MealType mealType, String memo) {
		MealMemo m = new MealMemo();
		m.id = UUID.randomUUID();
		m.userId = userId;
		m.date = date;
		m.mealType = mealType;
		m.memo = memo;
		return m;
	}

	public void changeMemo(String memo) {
		this.memo = memo;
	}
}
