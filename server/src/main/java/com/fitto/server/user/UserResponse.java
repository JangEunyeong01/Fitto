package com.fitto.server.user;

import java.time.Instant;
import java.util.List;

/**
 * 명세 5장 User 리소스. 엔티티를 그대로 내보내지 않는 이유는 password 때문이다 —
 * 엔티티를 응답으로 쓰면 필드를 하나 추가할 때마다 밖으로 샐 위험이 생긴다.
 */
public record UserResponse(
		String userId,
		String email,
		boolean emailVerified,
		String name,
		Gender gender,
		Integer age,
		Double height,
		Double weight,
		Double targetWeight,
		Birthday birthday,
		ActivityLevel activityLevel,
		Goal goal,
		List<String> diseases,
		List<String> customDiseases,
		List<String> preferredFoods,
		List<String> customPreferredFoods,
		List<String> allergies,
		List<String> customAllergies,
		Personality personality,
		WorkoutPreferenceResponse workoutPreference,
		boolean periodEnabled,
		GoalsResponse goals,
		Instant startedAt,
		Instant createdAt,
		Instant updatedAt) {

	/** 세 칸 다 비어 있으면 birthday 자체가 null. 예전 가입자는 year만 비어 있을 수 있다. */
	public record Birthday(Integer year, Integer month, Integer day) {
	}

	public record WorkoutPreferenceResponse(String intensity, String equipment, String focus) {
	}

	public record GoalsResponse(int targetCalorie, int waterGoal, boolean waterGoalCustom, int stepGoal, int cupSize) {
	}

	public static UserResponse from(User user) {
		Birthday birthday = user.getBirthYear() != null || user.getBirthdayMonth() != null || user.getBirthdayDay() != null
				? new Birthday(user.getBirthYear(), user.getBirthdayMonth(), user.getBirthdayDay())
				: null;

		WorkoutPreference pref = user.getWorkoutPreference();
		Goals goals = user.getGoals();

		return new UserResponse(
				user.getId().toString(),
				user.getEmail(),
				user.isEmailVerified(),
				user.getName(),
				user.getGender(),
				user.getAge(),
				user.getHeight(),
				user.getWeight(),
				user.getTargetWeight(),
				birthday,
				user.getActivityLevel(),
				user.getGoal(),
				List.copyOf(user.getDiseases()),
				List.copyOf(user.getCustomDiseases()),
				List.copyOf(user.getPreferredFoods()),
				List.copyOf(user.getCustomPreferredFoods()),
				List.copyOf(user.getAllergies()),
				List.copyOf(user.getCustomAllergies()),
				user.getPersonality(),
				new WorkoutPreferenceResponse(pref.getIntensity(), pref.getEquipment(), pref.getFocus()),
				user.isPeriodEnabled(),
				new GoalsResponse(goals.getTargetCalorie(), goals.getWaterGoal(), goals.isWaterGoalCustom(),
						goals.getStepGoal(), goals.getCupSize()),
				user.getStartedAt(),
				user.getCreatedAt(),
				user.getUpdatedAt());
	}
}
