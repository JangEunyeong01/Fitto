package com.fitto.server.user;

/**
 * 탈퇴 사유(시안 40). 직접 쓰는 칸은 두지 않는다 — 사람들이 연락처나 병명을 적으면 익명이 깨진다.
 */
public enum DeletionReason {
	TEDIOUS,
	TOO_MANY_NOTIFICATIONS,
	MISSING_FEATURE,
	OTHER_APP,
	PRIVACY,
	OTHER;

	@Override
	public String toString() {
		return name().toLowerCase();
	}
}
