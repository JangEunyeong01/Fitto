package com.fitto.server.common.error;

/** 서비스 코드에서 던지는 예외. 상태 코드와 한국어 문구는 ErrorCode가 들고 있다. */
public class ApiException extends RuntimeException {

	private final ErrorCode errorCode;

	public ApiException(ErrorCode errorCode) {
		super(errorCode.getMessage());
		this.errorCode = errorCode;
	}

	/** 기본 문구 대신 상황에 맞는 문장을 보여주고 싶을 때. */
	public ApiException(ErrorCode errorCode, String message) {
		super(message);
		this.errorCode = errorCode;
	}

	public ErrorCode getErrorCode() {
		return errorCode;
	}
}
