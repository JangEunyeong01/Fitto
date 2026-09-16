package com.fitto.server.period;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

import org.springframework.stereotype.Component;

/**
 * 생리 주기 계산(명세 2-5). 앱의 utils/periodCycle.ts와 같은 규칙이다.
 *
 * 실제 예측 알고리즘이 아니라 평균 주기 모델이다. 오차가 있다는 전제로 쓰며,
 * 앱은 "예상"임이 드러나게 표시한다.
 */
@Component
public class PeriodCalculator {

	/** 이번 주기에서 며칠째인지(0 = 시작일). 과거·미래 날짜에도 주기를 반복 적용한다. */
	public int offset(LocalDate date, LocalDate startDate, int cycleLength) {
		long diff = ChronoUnit.DAYS.between(startDate, date);
		return (int) (((diff % cycleLength) + cycleLength) % cycleLength);
	}

	/** 배란일은 다음 생리 시작 14일 전이 표준 추정치다. */
	public int ovulationOffset(int cycleLength) {
		return Math.max(0, cycleLength - 14);
	}

	public boolean isPeriodDay(LocalDate date, PeriodSetting setting) {
		return offset(date, setting.getStartDate(), setting.getCycleLength()) < setting.getPeriodLength();
	}

	/** 오늘 이후 가장 가까운 생리 시작일. 오늘이 시작일이면 한 주기 뒤를 본다. */
	public LocalDate nextPeriod(LocalDate today, PeriodSetting setting) {
		int cycle = setting.getCycleLength();
		int todayOffset = offset(today, setting.getStartDate(), cycle);
		int daysUntil = (cycle - todayOffset) % cycle;
		return today.plusDays(daysUntil == 0 ? cycle : daysUntil);
	}

	/** 오늘 이후 가장 가까운 배란일(오늘 포함). */
	public LocalDate ovulation(LocalDate today, PeriodSetting setting) {
		int cycle = setting.getCycleLength();
		int todayOffset = offset(today, setting.getStartDate(), cycle);
		int daysUntil = ((ovulationOffset(cycle) - todayOffset) % cycle + cycle) % cycle;
		return today.plusDays(daysUntil);
	}

	/** 가임기는 배란일 기준 5일 전부터 당일까지(정자 생존 기간을 고려한 통상 범위). */
	public LocalDate fertileStart(LocalDate today, PeriodSetting setting) {
		return ovulation(today, setting).minusDays(5);
	}

	/** 이번 주기 며칠째인지, 화면에 보여주는 1부터 시작하는 값. */
	public int cycleDay(LocalDate today, PeriodSetting setting) {
		return offset(today, setting.getStartDate(), setting.getCycleLength()) + 1;
	}
}
