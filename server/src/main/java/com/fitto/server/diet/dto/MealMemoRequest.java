package com.fitto.server.diet.dto;

import java.time.LocalDate;

import com.fitto.server.diet.MealType;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 끼니 메모 저장(명세 7장). memo가 null이거나 빈 문자열이면 삭제한다. */
public record MealMemoRequest(
		@NotNull LocalDate date,
		@NotNull MealType mealType,
		@Size(max = 80) String memo) {
}
