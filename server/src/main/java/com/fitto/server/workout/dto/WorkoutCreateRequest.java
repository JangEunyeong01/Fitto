package com.fitto.server.workout.dto;

import java.time.LocalDate;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 운동 기록 추가(명세 8장).
 *
 * calories는 exerciseCode가 있으면 서버가 MET로 계산하므로 보내지 않아도 된다.
 * 코드가 없는(목록에 없는) 운동이면 필수다.
 */
public record WorkoutCreateRequest(
		UUID id,
		@NotNull LocalDate date,
		@Size(max = 30) String exerciseCode,
		@NotBlank @Size(min = 1, max = 30) String name,
		@NotNull @Min(1) @Max(600) Integer duration,
		@Min(0) @Max(3000) Integer calories,
		@Size(max = 60) String memo,
		UUID routineId) {
}
