package com.fitto.server.common;

import java.time.Clock;
import java.time.LocalDate;

import org.springframework.stereotype.Component;

import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;

/**
 * 기록 날짜 검증(명세 0-1).
 *
 * 날짜는 기기 기준이라 서버는 사용자의 "오늘"을 모른다. 시간대 차이를 감안해
 * 서버 UTC 날짜 + 1일까지만 허용한다. 그보다 뒤면 잘못된 입력으로 본다.
 */
@Component
public class DateGuard {

	private final Clock clock;

	public DateGuard() {
		this(Clock.systemUTC());
	}

	/** 테스트에서 고정 시각을 넣기 위한 생성자. */
	public DateGuard(Clock clock) {
		this.clock = clock;
	}

	public void checkNotFuture(LocalDate date) {
		if (date.isAfter(LocalDate.now(clock).plusDays(1))) {
			throw new ApiException(ErrorCode.INVALID_DATE, "미래 날짜에는 기록할 수 없어요.");
		}
	}
}
