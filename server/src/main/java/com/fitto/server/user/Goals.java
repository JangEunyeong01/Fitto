package com.fitto.server.user;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 하루 목표치(명세 5장 goals).
 * targetCalorie는 서버가 계산해서 넣는 값이라 앱이 보내면 거부한다.
 */
@Embeddable
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Goals {

	@Column(nullable = false)
	private int targetCalorie;

	@Column(nullable = false)
	private int waterGoal;

	/**
	 * 사용자가 물 목표를 직접 정했는지. true면 프로필이 바뀌어도 계산값으로 덮어쓰지 않는다
	 * (직접 정한 값을 말없이 되돌리면 앱이 고장 난 것처럼 보인다).
	 */
	@Column(nullable = false)
	private boolean waterGoalCustom;

	@Column(nullable = false)
	private int stepGoal;

	@Column(nullable = false)
	private int cupSize;

	public static Goals initial() {
		Goals goals = new Goals();
		goals.targetCalorie = 0;
		goals.waterGoal = 0;
		goals.waterGoalCustom = false;
		goals.stepGoal = 8000;
		goals.cupSize = 250;
		return goals;
	}

	/** 서버 계산 결과 반영. 직접 정한 물 목표는 건드리지 않는다. */
	public void applyCalculated(int targetCalorie, int waterGoal) {
		this.targetCalorie = targetCalorie;
		if (!waterGoalCustom) {
			this.waterGoal = waterGoal;
		}
	}

	public void setCustomWaterGoal(int waterGoal) {
		this.waterGoal = waterGoal;
		this.waterGoalCustom = true;
	}

	/** 직접 설정 해제. 다음 재계산 때 계산값으로 돌아간다. */
	public void clearCustomWaterGoal() {
		this.waterGoalCustom = false;
	}

	public void setStepGoal(int stepGoal) {
		this.stepGoal = stepGoal;
	}

	public void setCupSize(int cupSize) {
		this.cupSize = cupSize;
	}
}
