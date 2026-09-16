package com.fitto.server.daily;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.DateGuard;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.daily.dto.StepsItem;
import com.fitto.server.daily.dto.WaterResponse;
import com.fitto.server.user.User;
import com.fitto.server.user.UserGoalService;
import com.fitto.server.user.UserRepository;
import com.fitto.server.user.UserResponse;

/** 수분·걸음수·체중 (명세 9~11장). 셋 다 "날짜당 값 하나"라 저장 방식이 같다. */
@Service
public class DailyService {

	/** 기간 조회 상한. 기기가 몇 년치를 한 번에 요청해 서버가 멈추는 걸 막는다. */
	private static final int MAX_RANGE_DAYS = 92;

	private final DailyWaterRepository waterRepository;
	private final DailyStepsRepository stepsRepository;
	private final WeightLogRepository weightRepository;
	private final UserRepository userRepository;
	private final UserGoalService userGoalService;
	private final DateGuard dateGuard;

	public DailyService(DailyWaterRepository waterRepository, DailyStepsRepository stepsRepository,
			WeightLogRepository weightRepository, UserRepository userRepository, UserGoalService userGoalService,
			DateGuard dateGuard) {
		this.waterRepository = waterRepository;
		this.stepsRepository = stepsRepository;
		this.weightRepository = weightRepository;
		this.userRepository = userRepository;
		this.userGoalService = userGoalService;
		this.dateGuard = dateGuard;
	}

	// ---------- 수분 ----------

	@Transactional(readOnly = true)
	public WaterResponse getWater(UUID userId, LocalDate date) {
		int amount = waterRepository.findByUserIdAndDate(userId, date).map(DailyWater::getAmount).orElse(0);
		return WaterResponse.of(date, amount, requireUser(userId).getGoals().getWaterGoal());
	}

	@Transactional
	public WaterResponse putWater(UUID userId, LocalDate date, int amount) {
		dateGuard.checkNotFuture(date);

		waterRepository.findByUserIdAndDate(userId, date)
				.ifPresentOrElse(water -> water.changeAmount(amount),
						() -> waterRepository.save(DailyWater.create(userId, date, amount)));

		return WaterResponse.of(date, amount, requireUser(userId).getGoals().getWaterGoal());
	}

	// ---------- 걸음수 ----------

	@Transactional(readOnly = true)
	public StepsRange getSteps(UUID userId, LocalDate from, LocalDate to) {
		checkRange(from, to);

		List<StepsItem> items = stepsRepository.findAllByUserIdAndDateBetween(userId, from, to).stream()
				.sorted((a, b) -> a.getDate().compareTo(b.getDate()))
				.map(s -> new StepsItem(s.getDate(), s.getSteps()))
				.toList();

		return new StepsRange(requireUser(userId).getGoals().getStepGoal(), items);
	}

	@Transactional
	public List<StepsItem> putSteps(UUID userId, List<StepsItem> items) {
		items.forEach(item -> dateGuard.checkNotFuture(item.date()));

		for (StepsItem item : items) {
			stepsRepository.findByUserIdAndDate(userId, item.date())
					.ifPresentOrElse(entity -> entity.changeSteps(item.steps()),
							() -> stepsRepository.save(DailySteps.create(userId, item.date(), item.steps())));
		}
		return items;
	}

	// ---------- 체중 ----------

	@Transactional(readOnly = true)
	public WeightRange getWeights(UUID userId, LocalDate from, LocalDate to) {
		LocalDate start = from != null ? from : LocalDate.of(2000, 1, 1);
		LocalDate end = to != null ? to : LocalDate.now().plusDays(1);

		List<WeightItem> items = weightRepository.findAllByUserIdAndDateBetweenOrderByDate(userId, start, end).stream()
				.map(w -> new WeightItem(w.getDate(), w.getWeight()))
				.toList();

		return new WeightRange(requireUser(userId).getTargetWeight(), items);
	}

	/**
	 * 체중 저장. 저장한 날짜가 가장 최근 기록이면 프로필 체중을 바꾸고 목표를 다시 계산한다(명세 2-6).
	 * 과거 날짜를 채워 넣은 경우에는 현재 체중이 아니므로 프로필을 건드리지 않는다.
	 */
	@Transactional
	public WeightPutResult putWeight(UUID userId, LocalDate date, double weight) {
		dateGuard.checkNotFuture(date);

		weightRepository.findByUserIdAndDate(userId, date)
				.ifPresentOrElse(log -> log.changeWeight(weight),
						() -> weightRepository.save(WeightLog.create(userId, date, weight)));

		User user = requireUser(userId);
		boolean isLatest = weightRepository.findTopByUserIdOrderByDateDesc(userId)
				.map(latest -> !latest.getDate().isAfter(date))
				.orElse(true);

		if (isLatest) {
			user.changeWeight(weight);
			userGoalService.recalculate(user);
		}

		return new WeightPutResult(date, weight, UserResponse.from(user));
	}

	@Transactional
	public void deleteWeight(UUID userId, LocalDate date) {
		// 지운다고 프로필 체중을 되돌리지는 않는다(명세 11장). 어느 값으로 돌려야 하는지가 분명하지 않다.
		weightRepository.findByUserIdAndDate(userId, date).ifPresent(weightRepository::delete);
	}

	private User requireUser(UUID userId) {
		return userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
	}

	private static void checkRange(LocalDate from, LocalDate to) {
		if (from.isAfter(to)) {
			throw new ApiException(ErrorCode.INVALID_INPUT, "시작일이 종료일보다 뒤예요.");
		}
		if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
			throw new ApiException(ErrorCode.INVALID_INPUT, "한 번에 최대 " + MAX_RANGE_DAYS + "일까지 조회할 수 있어요.");
		}
	}

	public record StepsRange(int goal, List<StepsItem> items) {
	}

	public record WeightItem(LocalDate date, double weight) {
	}

	public record WeightRange(Double targetWeight, List<WeightItem> items) {
	}

	public record WeightPutResult(LocalDate date, double weight, UserResponse user) {
	}
}
