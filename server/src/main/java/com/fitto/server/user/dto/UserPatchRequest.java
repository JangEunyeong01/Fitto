package com.fitto.server.user.dto;

import java.util.List;

import com.fitto.server.user.ActivityLevel;
import com.fitto.server.user.Gender;
import com.fitto.server.user.Goal;
import com.fitto.server.user.Personality;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * 내 정보 수정(명세 5장). 보내지 않은 필드는 그대로 둔다 — null도 "안 보냄"으로 본다.
 * 실수로 빠뜨린 필드 때문에 프로필이 지워지는 쪽이 더 위험하다.
 *
 * 그래서 "지워라"는 뜻은 null이 아니라 별도 필드로 받는다.
 * 물 목표 직접 설정을 해제할 때는 goals.waterGoalCustom에 false를 보낸다.
 */
public record UserPatchRequest(
		@Size(min = 1, max = 20) String name,
		Gender gender,
		@Min(10) @Max(100) Integer age,
		@DecimalMin("100") @DecimalMax("250") Double height,
		@DecimalMin("25") @DecimalMax("250") Double weight,
		@DecimalMin("25") @DecimalMax("250") Double targetWeight,
		ActivityLevel activityLevel,
		Goal goal,
		Personality personality,
		@Valid Birthday birthday,
		List<@Size(max = 30) String> diseases,
		List<@Size(min = 1, max = 20) String> customDiseases,
		List<@Size(max = 30) String> preferredFoods,
		List<@Size(min = 1, max = 20) String> customPreferredFoods,
		List<@Size(max = 30) String> allergies,
		List<@Size(min = 1, max = 20) String> customAllergies,
		Boolean periodEnabled,
		@Valid Goals goals) {

	public record Birthday(@Min(1) @Max(12) Integer month, @Min(1) @Max(31) Integer day) {
	}

	/**
	 * @param waterGoal       직접 정한 물 목표. 보내면 waterGoalCustom이 true가 된다
	 * @param waterGoalCustom false를 보내면 직접 설정을 해제하고 계산값으로 되돌린다
	 */
	public record Goals(
			@Min(500) @Max(4000) Integer waterGoal,
			Boolean waterGoalCustom,
			@Min(3000) @Max(20000) Integer stepGoal,
			@Min(50) @Max(1000) Integer cupSize) {
	}
}
