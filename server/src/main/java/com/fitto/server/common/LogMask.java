package com.fitto.server.common;

/**
 * 로그에 남길 값을 가린다.
 *
 * 보안 이벤트를 남기려면 "누구에 대한 시도인지"를 알아야 하는데, 그렇다고 이메일을
 * 그대로 쌓으면 로그 자체가 개인정보 보관소가 된다. 같은 계정을 노린 시도인지 구분될 만큼만 남긴다.
 */
public final class LogMask {

	private LogMask() {
	}

	/** {@code hong@fitto.app} → {@code ho***@fitto.app} */
	public static String email(String email) {
		if (email == null || email.isBlank()) {
			return "(없음)";
		}

		int at = email.indexOf('@');
		if (at < 0) {
			// 이메일 모양이 아니면 통째로 가린다. 무엇이 들어온 건지 알 수 없어서다.
			return "***";
		}

		String local = email.substring(0, at);
		String domain = email.substring(at);
		int keep = Math.min(2, local.length());
		return local.substring(0, keep) + "***" + domain;
	}
}
