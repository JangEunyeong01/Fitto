package com.fitto.server.common.error;

import org.springframework.http.HttpStatus;

/**
 * API 명세서 17장의 에러 코드. message는 화면에 그대로 띄울 수 있는 한국어 문장이다.
 * 앱은 code로 분기하고 message를 보여준다. 그래서 code는 함부로 바꾸면 안 된다.
 */
public enum ErrorCode {
	INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값을 다시 확인해 주세요."),
	INVALID_DATE(HttpStatus.BAD_REQUEST, "날짜가 올바르지 않아요."),
	UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요."),
	TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "로그인이 만료됐어요. 다시 로그인해 주세요."),
	// 이메일과 비밀번호 중 무엇이 틀렸는지 알려주지 않는다. 가입 여부를 확인하는 통로가 된다.
	INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호가 올바르지 않아요."),
	REFRESH_TOKEN_INVALID(HttpStatus.UNAUTHORIZED, "다시 로그인해 주세요."),
	REFRESH_TOKEN_REUSED(HttpStatus.UNAUTHORIZED, "보안을 위해 모든 기기에서 로그아웃했어요. 다시 로그인해 주세요."),
	TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "시도가 너무 잦아요. 잠시 후 다시 시도해 주세요."),
	FORBIDDEN(HttpStatus.FORBIDDEN, "권한이 없어요."),
	SIGNUP_CLOSED(HttpStatus.FORBIDDEN, "지금은 초대받은 이메일만 가입할 수 있어요."),
	NOT_FOUND(HttpStatus.NOT_FOUND, "찾을 수 없어요."),
	// 직접 입력한 음식은 그램 환산 정보가 없어 g ↔ 인분을 바꿔 계산할 수 없다(명세 7장).
	UNIT_CHANGE_NOT_ALLOWED(HttpStatus.BAD_REQUEST, "단위를 바꾸려면 기록을 지우고 다시 추가해 주세요."),
	PERIOD_NOT_SET(HttpStatus.NOT_FOUND, "생리 주기 정보가 아직 없어요."),
	EMAIL_DUPLICATED(HttpStatus.CONFLICT, "이미 가입된 이메일이에요."),
	ID_CONFLICT(HttpStatus.CONFLICT, "다른 곳에서 쓰고 있는 기록이에요."),
	PAYLOAD_TOO_LARGE(HttpStatus.PAYLOAD_TOO_LARGE, "보낸 데이터가 너무 커요."),
	// 아래 둘은 앱이 정상 동작하면 나오지 않는다. 잘못 부른 요청을 500으로 돌려주지 않으려고 둔다.
	METHOD_NOT_ALLOWED(HttpStatus.METHOD_NOT_ALLOWED, "요청 방식이 올바르지 않아요."),
	UNSUPPORTED_MEDIA_TYPE(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "요청 형식이 올바르지 않아요."),
	INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "잠시 후 다시 시도해 주세요.");

	private final HttpStatus status;
	private final String message;

	ErrorCode(HttpStatus status, String message) {
		this.status = status;
		this.message = message;
	}

	public HttpStatus getStatus() {
		return status;
	}

	public String getMessage() {
		return message;
	}
}
