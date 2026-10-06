package com.fitto.server.period.dto;

import java.time.LocalDate;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * 생리 기록 목록 전체(명세 12장). 서버는 받은 목록으로 통째로 바꾼다.
 * today를 받는 이유는 PeriodPutRequest와 같다 — 서버는 사용자의 오늘을 모른다.
 */
public record PeriodLogsPutRequest(
		@NotNull @Size(max = PeriodLogsPutRequest.MAX_LOGS) List<@NotNull @Valid PeriodLogDto> items,
		@NotNull LocalDate today) {

	/** 한 달에 한 번씩 20년. */
	public static final int MAX_LOGS = 240;
}
