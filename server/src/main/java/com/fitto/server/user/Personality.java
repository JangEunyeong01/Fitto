package com.fitto.server.user;

/** 명세 1장 personality. 피또가 말을 거는 말투. */
public enum Personality {
	FRIENDLY,
	STRICT,
	NEUTRAL;

	@Override
	public String toString() {
		return name().toLowerCase();
	}
}
