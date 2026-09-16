package com.fitto.server.workout.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/** 운동 기록 수정(명세 8장). 보내지 않은 필드는 그대로 둔다. */
public record WorkoutPatchRequest(
		@Min(1) @Max(600) Integer duration,
		@Min(0) @Max(3000) Integer calories,
		@Size(max = 60) String memo) {
}
