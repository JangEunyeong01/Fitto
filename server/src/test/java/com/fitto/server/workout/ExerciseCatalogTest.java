package com.fitto.server.workout;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** 명세 2-3의 예시를 옮긴 테스트. 앱의 calcExerciseKcal과 같은 값이 나와야 한다. */
class ExerciseCatalogTest {

	private final ExerciseCatalog catalog = new ExerciseCatalog();

	@Test
	void 명세_예시_달리기_30분_54kg() {
		double met = catalog.metOf("running").orElseThrow();
		assertEquals(8.0, met);
		// 8.0 × 54 × 30 / 60 = 216
		assertEquals(216, catalog.calories(met, 54, 30));
	}

	@Test
	void 목록에_없는_운동은_비어있다() {
		assertTrue(catalog.metOf("hula_hoop").isEmpty());
		assertTrue(catalog.metOf(null).isEmpty());
	}
}
