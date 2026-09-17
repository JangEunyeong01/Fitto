package com.fitto.server.auth;

import java.time.Duration;
import java.util.Set;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * 한 계정이 기록을 무한정 쌓는 걸 막는다.
 *
 * 로그인·가입은 따로 막아뒀지만 기록 API는 열려 있었다. 토큰 하나만 있으면 DB를 채울 수 있고,
 * 저장 용량이 정해진 곳에 올리면 한 계정이 전체 서비스를 멈추게 할 수 있다.
 *
 * 읽기는 세지 않는다. 데이터가 늘지 않기 때문이다.
 */
@Component
public class WriteRateLimitInterceptor implements HandlerInterceptor {

	private static final Logger log = LoggerFactory.getLogger(WriteRateLimitInterceptor.class);

	/**
	 * 분당 한도. 정상 사용으로는 닿지 않는 값이다.
	 * 오프라인에 쌓인 대기열이 한꺼번에 올라와도 30일치가 이 아래이고,
	 * 게스트 데이터 이전은 /me/import 한 번으로 끝나므로 여기에 걸리지 않는다.
	 */
	private static final AttemptCounter BY_USER = new AttemptCounter(300, Duration.ofMinutes(1));

	private static final Set<String> READ_METHODS = Set.of("GET", "HEAD", "OPTIONS");

	@Override
	public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
		if (READ_METHODS.contains(request.getMethod())) {
			return true;
		}

		UUID userId = currentUserId();
		// 인증 전이면 세지 않는다. 토큰 없는 요청은 어차피 401로 막히고,
		// 로그인·가입은 LoginAttemptGuard·SignupThrottle이 따로 본다.
		if (userId == null) {
			return true;
		}

		String key = userId.toString();
		if (BY_USER.isBlocked(key)) {
			log.warn("쓰기 제한: userId={} {} {}", userId, request.getMethod(), request.getRequestURI());
			throw new ApiException(ErrorCode.TOO_MANY_REQUESTS, "기록이 너무 빠르게 올라오고 있어요. 잠시 후 다시 시도해 주세요.");
		}
		BY_USER.record(key);
		return true;
	}

	private static UUID currentUserId() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null && authentication.getPrincipal() instanceof UUID userId) {
			return userId;
		}
		return null;
	}
}
