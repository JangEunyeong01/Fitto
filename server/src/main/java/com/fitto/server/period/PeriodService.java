package com.fitto.server.period;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.period.dto.PeriodDailyRequest;
import com.fitto.server.period.dto.PeriodDailyResponse;
import com.fitto.server.period.dto.PeriodLogDto;
import com.fitto.server.period.dto.PeriodLogsPutRequest;
import com.fitto.server.period.dto.PeriodPutRequest;
import com.fitto.server.period.dto.PeriodResponse;

/** 명세 12장. */
@Service
public class PeriodService {

	private static final int MAX_RANGE_DAYS = 92;

	/** 생리 한 번의 최대 길이. 그보다 길면 의사와 상의할 일이라 기록 실수로 본다. */
	public static final int MAX_LOG_DAYS = 15;

	private final PeriodSettingRepository settingRepository;
	private final PeriodDailyRepository dailyRepository;
	private final PeriodLogRepository logRepository;
	private final PeriodCalculator calculator;

	public PeriodService(PeriodSettingRepository settingRepository, PeriodDailyRepository dailyRepository,
			PeriodLogRepository logRepository, PeriodCalculator calculator) {
		this.settingRepository = settingRepository;
		this.dailyRepository = dailyRepository;
		this.logRepository = logRepository;
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

	/**
	 * 생리 데이터만 전부 지운다(설정 › 생리 주기 › 데이터 삭제). 계정과 다른 기록은 그대로.
	 * 설정 행까지 지워야 조회가 다시 404(아직 입력 안 함)가 된다.
	 */
	@Transactional
	public void deleteAll(UUID userId) {
		settingRepository.deleteById(userId);
		logRepository.deleteAllOfUser(userId);
		// 엔티티를 읽어서 지워야 period_daily_symptoms도 함께 지워진다.
		dailyRepository.deleteAllByUserId(userId);
	}

	@Transactional(readOnly = true)
	public List<PeriodLogDto> getLogs(UUID userId) {
		return logRepository.findAllByUserIdOrderByStartDate(userId).stream().map(PeriodLogDto::from).toList();
	}

	/** 받은 목록으로 통째로 바꾼다. 빈 목록이면 기록을 다 지운다. */
	@Transactional
	public List<PeriodLogDto> putLogs(UUID userId, PeriodLogsPutRequest request) {
		List<PeriodLogDto> sorted = validateLogs(request.items(), request.today());
		logRepository.deleteAllOfUser(userId);
		logRepository.saveAll(sorted.stream()
				.map(item -> PeriodLog.create(userId, item.startDate(), item.endDate()))
				.toList());
		return sorted;
	}

	/**
	 * 생리 기록 목록 검사. 가져오기(ImportService)도 같은 규칙을 쓴다.
	 * - 오늘보다 뒤에 시작하거나 끝날 수 없다
	 * - 끝날은 시작일보다 앞일 수 없고, 한 번에 최대 {@value #MAX_LOG_DAYS}일
	 * - 서로 겹치면 안 되고, 진행 중(끝날 없음)은 가장 최근 한 건만
	 *
	 * @return 시작일 순으로 정렬한 목록
	 */
	public static List<PeriodLogDto> validateLogs(List<PeriodLogDto> items, LocalDate today) {
		List<PeriodLogDto> sorted = items.stream()
				.sorted(Comparator.comparing(PeriodLogDto::startDate))
				.toList();
		for (int i = 0; i < sorted.size(); i++) {
			PeriodLogDto item = sorted.get(i);
			if (item.startDate().isAfter(today) || (item.endDate() != null && item.endDate().isAfter(today))) {
				throw new ApiException(ErrorCode.INVALID_DATE, "생리 기록은 오늘까지만 넣을 수 있어요.");
			}
			if (item.endDate() != null && (item.endDate().isBefore(item.startDate())
					|| ChronoUnit.DAYS.between(item.startDate(), item.endDate()) >= MAX_LOG_DAYS)) {
				throw new ApiException(ErrorCode.INVALID_INPUT, "생리 기간은 1일부터 " + MAX_LOG_DAYS + "일까지예요.");
			}
			if (i == sorted.size() - 1) {
				continue;
			}
			PeriodLogDto next = sorted.get(i + 1);
			if (item.endDate() == null) {
				throw new ApiException(ErrorCode.INVALID_INPUT, "진행 중인 생리는 가장 최근 기록만 될 수 있어요.");
			}
			if (!next.startDate().isAfter(item.endDate())) {
				throw new ApiException(ErrorCode.INVALID_INPUT, "생리 기록끼리 날짜가 겹쳐요.");
			}
		}
		return sorted;
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
