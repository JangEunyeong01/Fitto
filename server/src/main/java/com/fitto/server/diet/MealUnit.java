package com.fitto.server.diet;

/**
 * 음식 양의 단위(명세 1장 unit).
 * g은 무게, serving은 "1공기" 같은 제공량 단위다. 단위가 다르면 칼로리 계산식도 달라진다(명세 2-4).
 */
public enum MealUnit {
	G,
	SERVING;

	@Override
	public String toString() {
		return name().toLowerCase();
	}
}
