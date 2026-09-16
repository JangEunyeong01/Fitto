package com.fitto.server.user;

/** 명세 1장 gender. 목표 칼로리 계산(Mifflin-St Jeor)에서 남녀 상수가 다르다. */
public enum Gender {
	FEMALE,
	MALE;

	// JSON에서는 소문자 코드로 주고받는다(application.yaml의 enum toString 설정).
	@Override
	public String toString() {
		return name().toLowerCase();
	}
}
