package com.fitto.server.diet.dto;

import java.time.LocalDate;

import com.fitto.server.diet.MealType;

public record MealMemoResponse(LocalDate date, MealType mealType, String memo) {
}
