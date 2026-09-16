package com.fitto.server.workout.dto;

import java.util.List;
import java.util.UUID;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 루틴 저장·수정(명세 8장). 칼로리는 저장하지 않는다 — 쓸 때마다 그 시점 체중으로 계산한다. */
public record RoutineRequest(
		UUID id,
		@NotBlank @Size(min = 1, max = 30) String name,
		@NotEmpty @Size(max = 8) List<@Valid Exercise> exercises) {

	public record Exercise(
			@Size(max = 30) String exerciseCode,
			@NotBlank @Size(min = 1, max = 30) String name,
			@NotNull @Min(1) @Max(600) Integer duration) {
	}
}
