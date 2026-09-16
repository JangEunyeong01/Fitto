package com.fitto.server.daily.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

/**
 * 수분 저장(명세 9장). 누적이 아니라 절댓값이다.
 * +250ml를 눌렀을 때 앱이 더한 결과를 보낸다 — 재시도해도 두 번 더해지지 않는다.
 */
public record WaterPutRequest(
		@NotNull LocalDate date,
		@NotNull @Min(0) @Max(10000) Integer amount) {
}
