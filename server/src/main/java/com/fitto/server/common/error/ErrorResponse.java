package com.fitto.server.common.error;

import java.util.List;

/**
 * 에러 응답 본문(명세 0-6). 모든 실패 응답이 이 모양이라 앱은 한 군데서만 처리한다.
 * errors는 유효성 검사 실패일 때만 채운다.
 */
public record ErrorResponse(int status, String code, String message, List<FieldError> errors) {

	public record FieldError(String field, String reason) {
	}

	public static ErrorResponse of(ErrorCode code, String message) {
		return new ErrorResponse(code.getStatus().value(), code.name(), message, null);
	}

	public static ErrorResponse of(ErrorCode code, String message, List<FieldError> errors) {
		return new ErrorResponse(code.getStatus().value(), code.name(), message, errors);
	}
}
