package com.fitto.server.config;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;

/**
 * 배포 환경에서 위험한 설정으로 서버가 뜨는 걸 막는다.
 *
 * 설정 실수는 조용히 넘어가는 게 가장 나쁘다. JWT 시크릿이 개발 기본값인 채로 배포되면
 * 그 값을 아는 누구나 남의 계정 토큰을 만들 수 있는데, 겉으로는 아무 문제 없이 돌아간다.
 * 그래서 경고가 아니라 **부팅 실패**로 처리한다.
 *
 * 빈 생성 전(환경 설정을 읽은 직후)에 검사하는 이유: 늦게 검사하면 JWT 라이브러리가 먼저 터진다.
 * 그 예외는 스택이 라이브러리 내부를 가리켜서 "환경변수를 안 넣었다"는 진짜 원인이 안 보인다.
 * 배포 중에 로그를 보는 사람에게는 원인이 바로 읽히는 쪽이 낫다.
 *
 * ApplicationListener를 spring.factories가 아닌 SpringApplication에 직접 등록한다(ServerApplication).
 */
public class StartupSecurityCheck implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

	/** application.yaml에 적어둔 로컬 개발용 값. 이 값이 운영에 올라오면 안 된다. */
	private static final String DEV_SECRET = "local-dev-secret-change-me-32bytes-minimum";

	/** HS256 서명 키 최소 길이. 짧으면 서명을 추측하기 쉬워진다. */
	private static final int MIN_SECRET_BYTES = 32;

	@Override
	public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
		ConfigurableEnvironment env = event.getEnvironment();
		boolean isProd = Arrays.asList(env.getActiveProfiles()).contains("prod");

		// 기본값을 빈 문자열로 준다. 이게 없으면 환경변수가 없을 때 스프링이 치환에 실패하며
		// "Could not resolve placeholder 'JWT_SECRET'" 예외를 먼저 던져, 아래 안내가 나올 기회가 없다.
		String secret = env.getProperty("fitto.jwt.secret", "");

		if (secret.isBlank()) {
			fail("JWT_SECRET이 비어 있습니다. 환경변수를 설정하세요. (예: openssl rand -base64 48)");
		}
		if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
			fail("JWT_SECRET이 너무 짧습니다. 최소 " + MIN_SECRET_BYTES + "바이트가 필요합니다.");
		}
		if (isProd && DEV_SECRET.equals(secret)) {
			fail("운영 환경에서 개발용 JWT 시크릿을 쓰고 있습니다. JWT_SECRET 환경변수를 설정하세요.");
		}
		// DB 설정도 같은 이유로 기본값을 준다. 여러 개가 빠졌을 때 하나씩 고치지 않게 한 번에 알린다.
		if (isProd) {
			String missing = Stream.of("spring.datasource.url", "spring.datasource.username", "fitto.cors.allowed-origins")
					.filter(key -> env.getProperty(key, "").isBlank())
					.collect(Collectors.joining(", "));
			if (!missing.isEmpty()) {
				fail("운영에 필요한 설정이 비어 있습니다: " + missing + " (server/.env.example 참고)");
			}
		}

		if (isProd && "update".equals(env.getProperty("spring.jpa.hibernate.ddl-auto"))) {
			fail("운영 환경에서는 ddl-auto를 update로 둘 수 없습니다. 스키마는 마이그레이션으로 관리합니다.");
		}

		if (isProd) {
			checkProdOrigins(env.getProperty("fitto.cors.allowed-origins", ""));
		}

		// 코드를 로그로 찍는 건 로컬 개발용이다. 운영에서 켜지면 로그를 볼 수 있는 누구나 남의 비밀번호를 바꿀 수 있다.
		if (isProd && Boolean.parseBoolean(env.getProperty("fitto.mail.log-codes", "false"))) {
			fail("운영 환경에서 fitto.mail.log-codes를 켤 수 없습니다. 메일 코드가 로그에 남습니다.");
		}
	}

	/**
	 * 개발용으로 열어둔 주소가 그대로 배포되는 걸 막는다.
	 *
	 * 환경변수만 바꾸면 되는 구조라 값이 틀려도 코드 리뷰에 걸리지 않는다. 그래서 부팅 때 본다.
	 * 여기가 열리면 아무 사이트나 브라우저에서 이 API를 부를 수 있다.
	 */
	static void checkProdOrigins(String origins) {
		for (String origin : origins.split(",")) {
			String value = origin.trim();
			if (value.isEmpty()) {
				continue;
			}
			if (value.equals("*")) {
				fail("운영 환경에서 CORS_ORIGINS를 *로 둘 수 없습니다. 실제 앱 주소만 적으세요.");
			}
			if (value.contains("localhost") || value.contains("127.0.0.1")) {
				fail("운영 환경 CORS_ORIGINS에 개발용 주소가 남아 있습니다: " + value);
			}
			if (value.startsWith("http://")) {
				fail("운영 환경 CORS_ORIGINS는 https여야 합니다: " + value);
			}
		}
	}

	/** 로그에 한 번 찍고 끝낸다. 예외만 던지면 스프링 스택에 묻혀 안 보인다. */
	private static void fail(String message) {
		System.err.println("[설정 오류] " + message);
		throw new IllegalStateException(message);
	}

	/** SpringApplication에 이 리스너를 붙인다. */
	public static void register(SpringApplication application) {
		application.addListeners(new StartupSecurityCheck());
	}
}
