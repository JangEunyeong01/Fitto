package com.fitto.server.daily.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record StepsItem(
		@NotNull LocalDate date,
		@NotNull @Min(0) @Max(100000) Integer steps) {
}
