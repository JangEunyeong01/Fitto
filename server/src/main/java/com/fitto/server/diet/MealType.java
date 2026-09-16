package com.fitto.server.diet;

/** 끼니(명세 1장 mealType). */
public enum MealType {
	BREAKFAST,
	LUNCH,
	DINNER,
	SNACK;

	@Override
	public String toString() {
		return name().toLowerCase();
	}
}
