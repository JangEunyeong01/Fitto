package com.fitto.server.daily.dto;

import java.time.LocalDate;

/**
 * 명세 9장. goal은 조회 시점의 물 목표이고, percentage는 100을 넘을 수 있다 —
 * 목표를 넘겨 마신 걸 "100%"로 잘라 보여주면 얼마나 더 마셨는지가 사라진다.
 */
public record WaterResponse(LocalDate date, int amount, int goal, int percentage) {

	public static WaterResponse of(LocalDate date, int amount, int goal) {
		int percentage = goal > 0 ? (int) Math.floor(amount * 100.0 / goal) : 0;
		return new WaterResponse(date, amount, goal, percentage);
	}
}
