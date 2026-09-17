package com.fitto.server.auth;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Authorization 헤더의 accessToken을 확인해 인증 정보를 채운다(명세 0-4).
 * 토큰이 없거나 틀리면 그냥 넘긴다 — 인증이 필요한 경로인지는 SecurityConfig가 판단한다.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

	private static final String PREFIX = "Bearer ";

	/** 기한만 지난 토큰이었다는 표시. 앱은 이걸 보고 다시 로그인시키지 않고 갱신을 시도한다. */
	public static final String EXPIRED_ATTRIBUTE = "fitto.tokenExpired";

	private final JwtTokenProvider tokenProvider;

	public JwtAuthenticationFilter(JwtTokenProvider tokenProvider) {
		this.tokenProvider = tokenProvider;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {

		String header = request.getHeader("Authorization");
		if (header != null && header.startsWith(PREFIX)) {
			String token = header.substring(PREFIX.length());
			UUID userId = tokenProvider.parseUserId(token, false);
			if (userId != null) {
				var authentication = new UsernamePasswordAuthenticationToken(userId, null, List.of());
				authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
				SecurityContextHolder.getContext().setAuthentication(authentication);
			} else if (tokenProvider.isExpired(token)) {
				// 거절 사유를 여기서만 알 수 있다. 응답을 쓰는 건 SecurityConfig의 진입점이라 표시만 남긴다.
				request.setAttribute(EXPIRED_ATTRIBUTE, Boolean.TRUE);
			}
		}

		chain.doFilter(request, response);
	}
}
