package com.fitto.server.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.fitto.server.auth.JwtAuthenticationFilter;
import com.fitto.server.auth.JwtProperties;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.common.error.ErrorResponse;

// Spring Boot 4는 Jackson 3을 쓴다. 패키지가 com.fasterxml.jackson → tools.jackson으로 바뀌었다.
import tools.jackson.databind.ObjectMapper;

/**
 * 앱 전용 API라 세션·폼 로그인을 쓰지 않는다. 토큰으로만 인증한다(명세 0-4).
 * 게스트는 서버를 아예 부르지 않으므로(명세 3-2), 여는 경로는 인증 API와 헬스 체크뿐이다.
 */
@Configuration
@EnableConfigurationProperties(JwtProperties.class)
public class SecurityConfig {

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http, JwtAuthenticationFilter jwtFilter,
			ObjectMapper objectMapper) throws Exception {
		return http
				// 브라우저 폼이 아니라 토큰을 쓰므로 CSRF 토큰이 필요 없다.
				.csrf(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				.formLogin(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/auth/**", "/health").permitAll()
						.anyRequest().authenticated())
				.addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class)
				// 인증 실패도 명세 0-6의 모양으로 내려보낸다. 기본 응답은 본문이 비어 있어 앱이 처리할 게 없다.
				.exceptionHandling(handler -> handler
						.authenticationEntryPoint((request, response, e) -> write(response, objectMapper,
								ErrorCode.UNAUTHORIZED))
						.accessDeniedHandler((request, response, e) -> write(response, objectMapper,
								ErrorCode.FORBIDDEN)))
				.build();
	}

	private static void write(jakarta.servlet.http.HttpServletResponse response, ObjectMapper objectMapper,
			ErrorCode code) throws java.io.IOException {
		response.setStatus(code.getStatus().value());
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding("UTF-8");
		objectMapper.writeValue(response.getWriter(), ErrorResponse.of(code, code.getMessage()));
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
}
