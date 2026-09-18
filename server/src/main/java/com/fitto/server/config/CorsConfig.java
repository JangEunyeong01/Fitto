package com.fitto.server.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * 브라우저에서 오는 요청 허용 설정.
 *
 * 네이티브 앱은 CORS 검사를 받지 않지만, 개발 중에는 Expo 웹(localhost:8081)에서 서버를 부른다.
 * 허용 주소를 환경변수로 받는 이유는 배포된 웹 주소를 코드에 박지 않기 위해서다.
 *
 * 인증은 Authorization 헤더로만 하므로 쿠키를 허용하지 않는다(allowCredentials 미설정).
 * 쿠키를 안 쓰면 CSRF 위험도 함께 사라진다.
 */
@Configuration
public class CorsConfig {

	private final List<String> allowedOrigins;

	public CorsConfig(@Value("${fitto.cors.allowed-origins:http://localhost:8081}") List<String> allowedOrigins) {
		this.allowedOrigins = allowedOrigins;
	}

	@Bean
	public CorsConfigurationSource corsConfigurationSource() {
		CorsConfiguration config = new CorsConfiguration();
		config.setAllowedOrigins(allowedOrigins);
		config.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
		config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
		config.setMaxAge(3600L);

		UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
		source.registerCorsConfiguration("/**", config);
		return source;
	}
}
