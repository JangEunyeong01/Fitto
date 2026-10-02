package com.fitto.server.user;

import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.user.dto.UserPatchRequest;

/** 명세 5장. */
@Service
public class UserService {

	private final UserRepository userRepository;
	private final UserGoalService userGoalService;

	public UserService(UserRepository userRepository, UserGoalService userGoalService) {
		this.userRepository = userRepository;
		this.userGoalService = userGoalService;
	}

	@Transactional(readOnly = true)
	public UserResponse get(UUID userId) {
		return UserResponse.from(require(userId));
	}

	@Transactional
	public UserResponse patch(UUID userId, UserPatchRequest request) {
		User user = require(userId);

		// 명세 2-6: 무엇이 바뀌었느냐에 따라 재계산 범위가 다르다.
		// 물 목표는 체중·활동량이 바뀔 때만 움직인다 — 키를 고쳤다고 마셔야 할 물이 달라지지는 않는다.
		boolean calorieChanged = request.gender() != null || request.age() != null || request.height() != null
				|| request.goal() != null || request.weight() != null || request.activityLevel() != null;
		boolean waterChanged = request.weight() != null || request.activityLevel() != null;

		user.applyProfile(
				or(request.name(), user.getName()),
				or(request.gender(), user.getGender()),
				or(request.age(), user.getAge()),
				or(request.height(), user.getHeight()),
				or(request.weight(), user.getWeight()),
				or(request.targetWeight(), user.getTargetWeight()),
				or(request.activityLevel(), user.getActivityLevel()),
				or(request.goal(), user.getGoal()),
				or(request.personality(), user.getPersonality()),
				// 생년월일은 세 칸을 한 묶음으로 갈아끼운다. 묶음을 안 보내면 그대로 둔다.
				request.birthday() != null ? request.birthday().year() : user.getBirthYear(),
				request.birthday() != null ? request.birthday().month() : user.getBirthdayMonth(),
				request.birthday() != null ? request.birthday().day() : user.getBirthdayDay());

		user.replaceTagLists(request.diseases(), request.customDiseases(), request.preferredFoods(),
				request.customPreferredFoods(), request.allergies(), request.customAllergies());

		if (request.periodEnabled() != null) {
			user.changePeriodEnabled(request.periodEnabled());
		}

		boolean waterGoalCleared = applyGoals(user, request.goals());

		// 물 목표 직접 설정을 해제했으면 계산값으로 되돌려야 한다(명세 5장).
		// 프로필이 그대로여도 이 경우엔 다시 계산한다.
		if (calorieChanged || waterGoalCleared) {
			userGoalService.recalculate(user, waterChanged || waterGoalCleared);
		}

		return UserResponse.from(user);
	}

	/** 설정 → 데이터 초기화(F-043). 계정은 남기고 기록만 지우는 것은 각 도메인에서 처리한다. */
	@Transactional
	public void resetProfile(UUID userId) {
		User user = require(userId);
		user.applyProfile(user.getName(), null, null, null, null, null, null, null, Personality.FRIENDLY, null, null, null);
		user.replaceTagLists(java.util.List.of(), java.util.List.of(), java.util.List.of(), java.util.List.of(),
				java.util.List.of(), java.util.List.of());
	}

	/** @return 물 목표 직접 설정을 해제했으면 true. 호출한 쪽이 계산값으로 되돌린다 */
	private boolean applyGoals(User user, UserPatchRequest.Goals goals) {
		if (goals == null) {
			return false;
		}

		boolean cleared = false;
		// 해제가 먼저다. waterGoalCustom: false와 waterGoal 값이 같이 오면 값을 정한 쪽을 따른다.
		if (Boolean.FALSE.equals(goals.waterGoalCustom())) {
			user.getGoals().clearCustomWaterGoal();
			cleared = true;
		}
		if (goals.waterGoal() != null) {
			user.getGoals().setCustomWaterGoal(goals.waterGoal());
			cleared = false;
		}
		if (goals.stepGoal() != null) {
			user.getGoals().setStepGoal(goals.stepGoal());
		}
		if (goals.cupSize() != null) {
			user.getGoals().setCupSize(goals.cupSize());
		}
		return cleared;
	}

	private User require(UUID userId) {
		return userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));
	}

	private static <T> T or(T next, T current) {
		return next != null ? next : current;
	}
}
