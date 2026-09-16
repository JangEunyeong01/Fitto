package com.fitto.server.user;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

/**
 * 명세 2-1·2-2의 예시를 그대로 옮긴 테스트.
 * 앱에도 같은 공식이 있어서, 두 쪽이 어긋나면 사용자는 가입 직후 목표가 바뀌는 걸 본다.
 * 스프링 컨텍스트를 띄우지 않으므로 DB 없이도 돌아간다.
 */
class GoalCalculatorTest {

	private final GoalCalculator calculator = new GoalCalculator();

	@Test
	void 명세_예시_목표_칼로리() {
		// female, 26세, 165cm, 55kg, light, lose_weight
		// BMR 1290 → TDEE 1774 → -350 → 1424
		assertEquals(1424, calculator.targetCalorie(Gender.FEMALE, 26, 165, 55, ActivityLevel.LIGHT, Goal.LOSE_WEIGHT));
	}

	@Test
	void 명세_예시_물_목표() {
		// 55 × 30 × 1.1 = 1815 → 50 단위 반올림 → 1800
		assertEquals(1800, calculator.waterGoal(55, ActivityLevel.LIGHT));
	}

	@Test
	void 남성과_여성은_상수가_다르다() {
		int female = calculator.targetCalorie(Gender.FEMALE, 30, 170, 60, ActivityLevel.MODERATE, Goal.MAINTAIN);
		int male = calculator.targetCalorie(Gender.MALE, 30, 170, 60, ActivityLevel.MODERATE, Goal.MAINTAIN);
		assertEquals(2096, female);
		assertEquals(2353, male);
	}

	@Test
	void 극단값은_범위_안으로_자른다() {
		assertEquals(1200,
				calculator.targetCalorie(Gender.FEMALE, 100, 100, 25, ActivityLevel.SEDENTARY, Goal.LOSE_WEIGHT));
		assertEquals(5000,
				calculator.targetCalorie(Gender.MALE, 10, 250, 250, ActivityLevel.VERY_ACTIVE, Goal.GAIN_WEIGHT));
		assertEquals(4000, calculator.waterGoal(250, ActivityLevel.VERY_ACTIVE));
		assertEquals(750, calculator.waterGoal(25, ActivityLevel.SEDENTARY));
	}
}
