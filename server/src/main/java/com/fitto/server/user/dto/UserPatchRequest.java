package com.fitto.server.user.dto;

import java.util.List;
import java.util.Optional;

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
 * 내 정보 수정(명세 5장). 보내지 않은 필드는 그대로 둔다.
 *
 * waterGoal만 Optional인 이유: 이 필드는 "안 보냄(유지)"과 "null(직접 설정 해제)"을 구분해야 한다.
 * 일반 필드는 null을 "안 보냄"으로 본다 — 실수로 빠뜨린 필드 때문에 프로필이 지워지는 쪽이 더 위험하다.
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

	public record Goals(
			Optional<@Min(500) @Max(4000) Integer> waterGoal,
			@Min(3000) @Max(20000) Integer stepGoal,
			@Min(50) @Max(1000) Integer cupSize) {
	}
}
