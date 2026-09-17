package com.fitto.server.config;

import java.nio.charset.StandardCharsets;
import java.util.Arrays;

import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import com.fitto.server.auth.JwtProperties;

/**
 * 배포 환경에서 위험한 설정으로 서버가 뜨는 걸 막는다.
 *
 * 설정 실수는 조용히 넘어가는 게 가장 나쁘다. JWT 시크릿이 개발 기본값인 채로 배포되면
 * 그 값을 아는 누구나 남의 계정 토큰을 만들 수 있는데, 겉으로는 아무 문제 없이 돌아간다.
 * 그래서 경고가 아니라 **부팅 실패**로 처리한다 — 배포 파이프라인에서 바로 드러난다.
 */
@Component
public class StartupSecurityCheck implements ApplicationListener<ApplicationReadyEvent> {

	/** application.yaml에 적어둔 로컬 개발용 값. 이 값이 운영에 올라오면 안 된다. */
	private static final String DEV_SECRET = "local-dev-secret-change-me-32bytes-minimum";

	/** HS256 서명 키 최소 길이. 짧으면 서명을 추측하기 쉬워진다. */
	private static final int MIN_SECRET_BYTES = 32;

	private final JwtProperties properties;
	private final Environment environment;

	public StartupSecurityCheck(JwtProperties properties, Environment environment) {
		this.properties = properties;
		this.environment = environment;
	}

	@Override
	public void onApplicationEvent(ApplicationReadyEvent event) {
		String secret = properties.secret();
		boolean isProd = Arrays.asList(environment.getActiveProfiles()).contains("prod");

		if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
			throw new IllegalStateException(
					"JWT_SECRET이 너무 짧습니다. 최소 " + MIN_SECRET_BYTES + "바이트가 필요합니다.");
		}

		if (isProd && DEV_SECRET.equals(secret)) {
			throw new IllegalStateException(
					"운영 환경에서 개발용 JWT 시크릿을 쓰고 있습니다. JWT_SECRET 환경변수를 설정하세요.");
		}

		if (isProd && "update".equals(environment.getProperty("spring.jpa.hibernate.ddl-auto"))) {
			throw new IllegalStateException(
					"운영 환경에서는 ddl-auto를 update로 둘 수 없습니다. 스키마는 마이그레이션으로 관리합니다.");
		}
	}
}
