package com.fitto.server.period;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.period.dto.PeriodDailyRequest;
import com.fitto.server.period.dto.PeriodDailyResponse;
import com.fitto.server.period.dto.PeriodPutRequest;
import com.fitto.server.period.dto.PeriodResponse;

/** 명세 12장. */
@Service
public class PeriodService {

	private static final int MAX_RANGE_DAYS = 92;

	private final PeriodSettingRepository settingRepository;
	private final PeriodDailyRepository dailyRepository;
	private final PeriodCalculator calculator;

	public PeriodService(PeriodSettingRepository settingRepository, PeriodDailyRepository dailyRepository,
			PeriodCalculator calculator) {
		this.settingRepository = settingRepository;
		this.dailyRepository = dailyRepository;
		this.calculator = calculator;
	}

	/**
	 * 주기 정보 조회. 설정이 없으면 404 PERIOD_NOT_SET을 준다.
	 * 기본값으로 계산해 돌려주면 입력한 적 없는 사람에게 "생리 5일차"가 사실처럼 표시된다(명세 3-3).
	 */
	@Transactional(readOnly = true)
	public PeriodResponse get(UUID userId, LocalDate today) {
		PeriodSetting setting = settingRepository.findById(userId)
				.orElseThrow(() -> new ApiException(ErrorCode.PERIOD_NOT_SET));
		return toResponse(setting, today);
	}

	@Transactional
	public PeriodResponse put(UUID userId, PeriodPutRequest request) {
		if (request.startDate().isAfter(request.today())) {
			throw new ApiException(ErrorCode.INVALID_DATE, "마지막 생리 시작일이 오늘보다 뒤예요.");
		}
		if (request.periodLength() >= request.cycleLength()) {
			throw new ApiException(ErrorCode.INVALID_INPUT, "생리 기간은 주기보다 짧아야 해요.");
		}

		PeriodSetting setting = settingRepository.findById(userId)
				.map(existing -> {
					existing.change(request.startDate(), request.cycleLength(), request.periodLength());
					return existing;
				})
				.orElseGet(() -> settingRepository.save(PeriodSetting.create(userId, request.startDate(),
						request.cycleLength(), request.periodLength())));

		return toResponse(setting, request.today());
	}

	/** @return 남은 값이 없어 기록을 지웠으면 비어 있다. 컨트롤러가 200과 204를 가른다. */
	@Transactional
	public PeriodDailyResponse putDaily(UUID userId, LocalDate date, PeriodDailyRequest request) {
		if (request.isEmpty()) {
			dailyRepository.findByUserIdAndDate(userId, date).ifPresent(dailyRepository::delete);
			return null;
		}

		List<String> symptoms = request.symptoms() != null ? request.symptoms().stream().distinct().toList() : List.of();

		PeriodDaily daily = dailyRepository.findByUserIdAndDate(userId, date)
				.orElseGet(() -> dailyRepository.save(PeriodDaily.create(userId, date)));
		daily.change(request.condition(), symptoms, trimToNull(request.medication()), trimToNull(request.memo()));

		return PeriodDailyResponse.from(daily);
	}

	@Transactional(readOnly = true)
	public List<PeriodDailyResponse> getDailyRange(UUID userId, LocalDate from, LocalDate to) {
		if (from.isAfter(to)) {
			throw new ApiException(ErrorCode.INVALID_INPUT, "시작일이 종료일보다 뒤예요.");
		}
		if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
			throw new ApiException(ErrorCode.INVALID_INPUT, "한 번에 최대 " + MAX_RANGE_DAYS + "일까지 조회할 수 있어요.");
		}

		return dailyRepository.findAllByUserIdAndDateBetweenOrderByDate(userId, from, to).stream()
				.map(PeriodDailyResponse::from)
				.toList();
	}

	private PeriodResponse toResponse(PeriodSetting setting, LocalDate today) {
		LocalDate ovulation = calculator.ovulation(today, setting);
		return new PeriodResponse(
				setting.getStartDate(),
				setting.getCycleLength(),
				setting.getPeriodLength(),
				calculator.cycleDay(today, setting),
				calculator.nextPeriod(today, setting),
				ovulation,
				calculator.fertileStart(today, setting),
				ovulation);
	}

	private static String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}
}
