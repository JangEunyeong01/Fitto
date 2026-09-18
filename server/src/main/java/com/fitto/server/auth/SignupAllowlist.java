package com.fitto.server.auth;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 가입할 수 있는 이메일을 정해둔다.
 *
 * 서버 주소는 공개하지 않아도 인터넷에 열려 있다. 기록 API는 토큰이 있어야 쓸 수 있지만
 * 가입은 누구나 부를 수 있어서, 주소를 알아낸 사람이 계정을 만들 수 있다.
 * 혼자 쓰는 동안에는 목록에 있는 이메일만 받는다.
 *
 * 비워두면 누구나 가입할 수 있다. 공개할 때는 환경변수만 지우면 된다.
 */
@Component
public class SignupAllowlist {

	private final Set<String> allowed;

	public SignupAllowlist(@Value("${fitto.signup.allowed-emails:}") String emails) {
		this.allowed = parse(emails);
	}

	public boolean isAllowed(String email) {
		return allowed.isEmpty() || allowed.contains(normalize(email));
	}

	static Set<String> parse(String emails) {
		if (emails == null || emails.isBlank()) {
			return Set.of();
		}
		return Arrays.stream(emails.split(","))
				.map(SignupAllowlist::normalize)
				.filter(e -> !e.isEmpty())
				.collect(Collectors.toUnmodifiableSet());
	}

	// 가입할 때 이메일을 소문자로 저장하므로 비교도 같은 기준으로 한다.
	private static String normalize(String email) {
		return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
	}
}
