package com.fitto.server.auth;

import java.util.UUID;

import org.springframework.security.core.context.SecurityContextHolder;

import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;

/** 요청을 보낸 사용자의 ID. 컨트롤러마다 SecurityContext를 직접 꺼내지 않으려고 한 곳에 뒀다. */
public final class AuthenticatedUser {

	private AuthenticatedUser() {
	}

	public static UUID requireId() {
		var authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication == null || !(authentication.getPrincipal() instanceof UUID userId)) {
			throw new ApiException(ErrorCode.UNAUTHORIZED);
		}
		return userId;
	}
}
