package com.fitto.server.workout.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotNull;

/** 루틴 일괄 기록(명세 8장, F-035). 루틴에 담긴 운동을 그날 기록으로 한 번에 만든다. */
public record RoutineUseRequest(@NotNull LocalDate date) {
}
