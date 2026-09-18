package com.fitto.server.common.error;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/**
 * 모든 예외를 명세 0-6의 한 가지 모양으로 바꿔서 내려보낸다.
 * 컨트롤러마다 try-catch를 두지 않으려고 여기 모았다.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(ApiException.class)
	public ResponseEntity<ErrorResponse> handleApi(ApiException e) {
		ErrorCode code = e.getErrorCode();
		return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code, e.getMessage()));
	}

	/** @Valid 실패. 어느 필드가 왜 틀렸는지 앱이 입력칸 아래에 표시할 수 있게 내려준다. */
	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException e) {
		List<ErrorResponse.FieldError> errors = e.getBindingResult().getFieldErrors().stream()
				.map(f -> new ErrorResponse.FieldError(f.getField(), f.getCode()))
				.toList();

		String message = e.getBindingResult().getFieldErrors().stream()
				.map(org.springframework.validation.FieldError::getDefaultMessage)
				.filter(m -> m != null && !m.isBlank())
				.findFirst()
				.orElse(ErrorCode.INVALID_INPUT.getMessage());

		return ResponseEntity.status(ErrorCode.INVALID_INPUT.getStatus())
				.body(ErrorResponse.of(ErrorCode.INVALID_INPUT, message, errors));
	}

	/**
	 * 요청 본문을 읽지 못한 경우. 형식이 잘못된 JSON, UUID가 아닌 id, 목록에 없는 코드값 등이 여기로 온다.
	 *
	 * 이걸 따로 잡지 않으면 500이 나간다. 실제로 앱이 UUID가 아닌 id를 보내던 때
	 * 서버 잘못처럼 보여서 원인을 찾는 데 시간이 걸렸다. 400으로 돌려주면 보낸 쪽 문제임이 드러난다.
	 */
	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleUnreadable(HttpMessageNotReadableException e) {
		log.warn("요청 본문을 읽지 못함: {}", e.getMessage());
		ErrorCode code = ErrorCode.INVALID_INPUT;
		return ResponseEntity.status(code.getStatus())
				.body(ErrorResponse.of(code, "요청 형식이 올바르지 않아요."));
	}

	/** 예상 못 한 예외. 원인은 로그에만 남기고 사용자에게는 일반 문구를 준다. */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleUnknown(Exception e) {
		log.error("처리하지 못한 예외", e);
		ErrorCode code = ErrorCode.INTERNAL_ERROR;
		return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code, code.getMessage()));
	}
}
