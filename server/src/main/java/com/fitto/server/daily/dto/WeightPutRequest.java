package com.fitto.server.daily.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

public record WeightPutRequest(@NotNull @DecimalMin("25") @DecimalMax("250") Double weight) {
}
