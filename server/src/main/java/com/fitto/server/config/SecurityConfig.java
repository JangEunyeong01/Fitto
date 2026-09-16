package com.fitto.server.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

/**
 * 앱 전용 API라 세션·폼 로그인을 쓰지 않는다. 토큰으로만 인증한다(명세 0-4).
 * JWT 검증 필터는 인증 기능을 붙일 때 여기에 추가한다.
 */
@Configuration
public class SecurityConfig {

	@Bean
	public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
		return http
				// 브라우저 폼이 아니라 토큰을 쓰므로 CSRF 토큰이 필요 없다.
				.csrf(AbstractHttpConfigurer::disable)
				.httpBasic(AbstractHttpConfigurer::disable)
				.formLogin(AbstractHttpConfigurer::disable)
				.sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
				// 아직 인증을 붙이기 전이라 전부 열어둔다. 토큰 필터를 넣을 때 여기를 조인다.
				.authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
				.build();
	}

	@Bean
	public PasswordEncoder passwordEncoder() {
		return new BCryptPasswordEncoder();
	}
}
