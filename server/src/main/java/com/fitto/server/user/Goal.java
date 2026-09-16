package com.fitto.server.user;

/** 명세 1장 goal. 목표별 칼로리 보정값은 계산 쪽에 둔다. */
public enum Goal {
	LOSE_WEIGHT,
	GAIN_WEIGHT,
	MAINTAIN,
	HEALTH,
	STRENGTH,
	ENDURANCE;

	@Override
	public String toString() {
		return name().toLowerCase();
	}
}
