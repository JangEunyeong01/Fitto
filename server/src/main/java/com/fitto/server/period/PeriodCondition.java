package com.fitto.server.period;

/** 그날 몸 상태(명세 1장 생리 컨디션). */
public enum PeriodCondition {
	GOOD,
	NORMAL,
	BAD;

	@Override
	public String toString() {
		return name().toLowerCase();
	}
}
