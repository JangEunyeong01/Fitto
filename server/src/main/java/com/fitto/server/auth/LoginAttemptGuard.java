package com.fitto.server.auth;

import java.time.Duration;
import java.util.Locale;

import org.springframework.stereotype.Component;

/**
 * 로그인 무차별 대입 방어(명세 4장).
 *
 * 두 축으로 막는다.
 * - **이메일당**: 한 계정의 비밀번호를 계속 찔러보는 공격
 * - **IP당**: 이메일을 바꿔가며 흔한 비밀번호를 뿌리는 공격(password spraying)
 *
 * 이메일 기준만 두면 두 번째를 못 막는다. 계정마다 카운터가 새로 시작하기 때문에
 * "이메일 1000개 × 각 1회"는 아무 제한에도 걸리지 않는다.
 */
@Component
public class LoginAttemptGuard {

	/** 한 계정을 노린 공격. 정상 사용자가 오타로 막히지 않을 만큼은 여유를 둔다. */
	private static final AttemptCounter BY_EMAIL = new AttemptCounter(10, Duration.ofMinutes(5));

	/** 여러 계정을 훑는 공격. 한 IP를 공유하는 가족·회사를 고려해 이메일 기준보다 넉넉하게. */
	private static final AttemptCounter BY_IP = new AttemptCounter(30, Duration.ofMinutes(10));

	public boolean isBlocked(String email, String clientIp) {
		return BY_EMAIL.isBlocked(key(email)) || BY_IP.isBlocked(clientIp);
	}

	public void recordFailure(String email, String clientIp) {
		BY_EMAIL.record(key(email));
		BY_IP.record(clientIp);
	}

	/** 로그인에 성공하면 그 계정의 실패 기록은 지운다. IP 쪽은 남긴다 — 성공 한 번으로 풀리면 막는 의미가 없다. */
	public void clear(String email) {
		BY_EMAIL.clear(key(email));
	}

	// 대소문자만 바꿔가며 한도를 우회하지 못하게 한다.
	private static String key(String email) {
		return email.toLowerCase(Locale.ROOT);
	}
}
