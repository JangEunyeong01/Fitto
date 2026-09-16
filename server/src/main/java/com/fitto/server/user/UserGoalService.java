package com.fitto.server.user;

import org.springframework.stereotype.Service;

/**
 * 목표 재계산(명세 2-6). 프로필이 바뀌거나 가장 최근 체중이 바뀔 때 부른다.
 *
 * 재계산 조건을 호출하는 쪽마다 적으면 한 군데를 빠뜨렸을 때 목표가 옛날 값으로 남는다.
 * 계산에 필요한 값이 다 있는지 확인하는 것도 여기서 한 번만 한다.
 */
@Service
public class UserGoalService {

	private final GoalCalculator calculator;

	public UserGoalService(GoalCalculator calculator) {
		this.calculator = calculator;
	}

	/** 계산에 필요한 값이 하나라도 없으면 건드리지 않는다. 반쪽짜리 값으로 목표를 덮어쓰지 않기 위해서다. */
	public void recalculate(User user) {
		if (user.getGender() == null || user.getAge() == null || user.getHeight() == null
				|| user.getWeight() == null || user.getActivityLevel() == null || user.getGoal() == null) {
			return;
		}

		user.getGoals().applyCalculated(
				calculator.targetCalorie(user.getGender(), user.getAge(), user.getHeight(), user.getWeight(),
						user.getActivityLevel(), user.getGoal()),
				calculator.waterGoal(user.getWeight(), user.getActivityLevel()));
	}
}
