package com.fitto.server.user;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 운동 설정(명세 1장 workoutPreference). 운동 추천 규칙이 이 값을 받는다.
 * 코드 목록이 앞으로 늘어날 수 있어 enum 대신 문자열로 둔다.
 */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class WorkoutPreference {

	@Column(nullable = false, length = 20)
	private String intensity;

	@Column(nullable = false, length = 20)
	private String equipment;

	@Column(nullable = false, length = 20)
	private String focus;

	public static WorkoutPreference initial() {
		return of("normal", "bodyweight", "full");
	}

	public static WorkoutPreference of(String intensity, String equipment, String focus) {
		WorkoutPreference p = new WorkoutPreference();
		p.intensity = intensity;
		p.equipment = equipment;
		p.focus = focus;
		return p;
	}
}
