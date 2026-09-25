package com.fitto.server.auth.dto;

import java.time.Instant;
import java.util.List;

import com.fitto.server.user.ActivityLevel;
import com.fitto.server.user.Gender;
import com.fitto.server.user.Goal;
import com.fitto.server.user.Personality;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * 회원가입 요청(명세 4장).
 * 온보딩에서 받은 프로필을 함께 보낸다 — 가입 직후 목표 칼로리를 계산해 돌려주기 위해서다.
 *
 * @param startedAt 게스트로 앱을 처음 쓴 시각. 없으면 가입 시각. "함께한 지 N일"이 1일로 되돌아가지 않게 한다
 */
public record SignupRequest(
		@NotBlank @Email @Size(max = 254) String email,

		@NotBlank @Size(min = 8, max = 64)
		@Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "비밀번호는 영문과 숫자를 모두 포함해야 해요.")
		String password,

		@NotNull @Valid Profile profile,

		Instant startedAt) {

	public record Profile(
			@NotBlank @Size(min = 1, max = 20) String name,
			@NotNull Gender gender,
			@NotNull @Min(10) @Max(100) Integer age,
			@NotNull @Min(100) @Max(250) Double height,
			@NotNull @Min(25) @Max(250) Double weight,
			@Min(25) @Max(250) Double targetWeight,
			@NotNull ActivityLevel activityLevel,
			@NotNull Goal goal,
			List<@Size(max = 30) String> diseases,
			List<@Size(min = 1, max = 20) String> customDiseases,
			List<@Size(max = 30) String> preferredFoods,
			List<@Size(min = 1, max = 20) String> customPreferredFoods,
			List<@Size(max = 30) String> allergies,
			List<@Size(min = 1, max = 20) String> customAllergies,
			@NotNull Personality personality,
			@Min(1900) @Max(2100) Integer birthYear,
			Integer birthdayMonth,
			Integer birthdayDay) {
	}
}
