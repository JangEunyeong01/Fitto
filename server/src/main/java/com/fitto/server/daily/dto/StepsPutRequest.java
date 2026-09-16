package com.fitto.server.daily.dto;

import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

/**
 * 걸음수 저장(명세 10장). 기기 건강 데이터와 동기화할 때 여러 날짜를 한 번에 보낸다.
 * 한 번에 31개까지 — 앱이 마지막 동기화 이후 한 달치를 밀어 넣는 상황을 기준으로 잡았다.
 */
public record StepsPutRequest(@NotEmpty @Size(max = 31) List<@Valid StepsItem> items) {
}
