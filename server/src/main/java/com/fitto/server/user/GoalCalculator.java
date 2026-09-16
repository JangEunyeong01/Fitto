package com.fitto.server.user;

import java.util.Map;

import org.springframework.stereotype.Component;

/**
 * 목표 칼로리·물 목표 계산 (명세 2-1, 2-2). 서버 값이 최종값이다.
 *
 * 계수를 enum이 아니라 여기 두는 이유: 계수를 조정해도 저장된 사용자 데이터(코드)는 그대로여야 한다.
 */
@Component
public class GoalCalculator {

	private static final Map<ActivityLevel, Double> CALORIE_FACTOR = Map.of(
			ActivityLevel.SEDENTARY, 1.2,
			ActivityLevel.LIGHT, 1.375,
			ActivityLevel.MODERATE, 1.55,
			ActivityLevel.ACTIVE, 1.725,
			ActivityLevel.VERY_ACTIVE, 1.9);

	private static final Map<ActivityLevel, Double> WATER_FACTOR = Map.of(
			ActivityLevel.SEDENTARY, 1.0,
			ActivityLevel.LIGHT, 1.1,
			ActivityLevel.MODERATE, 1.2,
			ActivityLevel.ACTIVE, 1.3,
			ActivityLevel.VERY_ACTIVE, 1.4);

	private static final Map<Goal, Integer> GOAL_ADJUST = Map.of(
			Goal.LOSE_WEIGHT, -350,
			Goal.GAIN_WEIGHT, 350,
			Goal.MAINTAIN, 0,
			Goal.HEALTH, 0,
			Goal.STRENGTH, 200,
			Goal.ENDURANCE, 100);

	/** Mifflin-St Jeor. 입력은 계산 전에 자른다(명세 2-1). */
	public int targetCalorie(Gender gender, int age, double height, double weight, ActivityLevel activity, Goal goal) {
		double w = clamp(weight, 25, 250);
		double h = clamp(height, 100, 250);
		double a = clamp(age, 10, 100);

		long bmr = Math.round(10 * w + 6.25 * h - 5 * a + (gender == Gender.MALE ? 5 : -161));
		long tdee = Math.round(bmr * CALORIE_FACTOR.get(activity));
		return (int) clamp(tdee + GOAL_ADJUST.get(goal), 1200, 5000);
	}

	/** 체중 × 30ml × 활동 계수. 50ml 단위로 반올림한다(명세 2-2). */
	public int waterGoal(double weight, ActivityLevel activity) {
		double w = clamp(weight, 25, 250);
		long rounded = Math.round(w * 30 * WATER_FACTOR.get(activity) / 50) * 50;
		return (int) clamp(rounded, 500, 4000);
	}

	private static double clamp(double value, double min, double max) {
		return Math.min(max, Math.max(min, value));
	}
}
