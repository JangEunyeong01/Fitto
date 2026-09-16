package com.fitto.server.workout;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.stereotype.Component;

/**
 * 내장 운동 목록과 MET 값(명세 1장 exerciseCode).
 * 앱의 src/data/workouts.ts와 같은 값을 들고 있다 — 앱은 게스트 모드에서 쓰고, 서버 값이 최종값이다(명세 2-3).
 *
 * MET는 운동 강도 지표다. 소모 칼로리 = MET × 체중(kg) × 시간(분) / 60.
 */
@Component
public class ExerciseCatalog {

	/** 운동 코드 → MET. 이름은 앱이 함께 보내므로 여기서는 계산에 필요한 값만 둔다. */
	private static final Map<String, Double> MET = new LinkedHashMap<>();

	static {
		MET.put("walking", 3.5);
		MET.put("brisk_walking", 4.3);
		MET.put("running", 8.0);
		MET.put("cycling", 6.8);
		MET.put("swimming", 6.0);
		MET.put("hiking", 6.0);
		MET.put("stair_climbing", 4.0);
		MET.put("jump_rope", 11.0);
		MET.put("weight_training", 5.0);
		MET.put("home_training", 3.8);
		MET.put("pilates", 3.0);
		MET.put("yoga", 2.5);
		MET.put("stretching", 2.3);
		MET.put("chair_squat", 3.5);
		MET.put("lunge", 4.0);
		MET.put("push_up", 3.8);
		MET.put("dumbbell_row", 3.5);
		MET.put("plank", 3.3);
	}

	public Optional<Double> metOf(String exerciseCode) {
		return exerciseCode == null ? Optional.empty() : Optional.ofNullable(MET.get(exerciseCode));
	}

	/** 명세 2-3: round(MET × 체중 × 시간(분) / 60). */
	public int calories(double met, double weightKg, int minutes) {
		return (int) Math.round(met * weightKg * minutes / 60.0);
	}
}
