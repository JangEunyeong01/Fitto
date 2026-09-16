package com.fitto.server.user;

/**
 * 명세 1장 activityLevel.
 * 계수(1.2~1.9)를 여기 상수로 박지 않고 계산 쪽에 둔다 —
 * 계수를 조정해도 저장된 사용자 데이터는 그대로여야 한다.
 */
public enum ActivityLevel {
	SEDENTARY,
	LIGHT,
	MODERATE,
	ACTIVE,
	VERY_ACTIVE;

	@Override
	public String toString() {
		return name().toLowerCase();
	}
}
