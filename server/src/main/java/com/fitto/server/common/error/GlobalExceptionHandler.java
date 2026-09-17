package com.fitto.server.common.error;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.servlet.NoHandlerFoundException;
import org.springframework.web.servlet.resource.NoResourceFoundException;

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

	/**
	 * 요청 자체가 잘못된 경우들. 스프링이 컨트롤러에 넘기기 전에 던지는 예외라 위 핸들러에 안 걸린다.
	 *
	 * 이걸 안 잡으면 아래 handleUnknown이 전부 500으로 바꾼다. 그러면 세 가지가 나빠진다.
	 * 보낸 쪽 잘못인데 서버 잘못처럼 보이고, 운영 로그가 ERROR로 뒤덮여 진짜 장애가 묻히고,
	 * 없는 경로를 훑기만 해도 5xx 알림이 울린다.
	 */
	@ExceptionHandler({ MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class,
			MultipartException.class })
	public ResponseEntity<ErrorResponse> handleBadRequest(Exception e) {
		log.warn("잘못된 요청: {}", e.getMessage());
		ErrorCode code = ErrorCode.INVALID_INPUT;
		return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code, code.getMessage()));
	}

	/** 없는 경로. 404로 돌려줘야 경로를 훑는 시도가 장애 로그에 섞이지 않는다. */
	@ExceptionHandler({ NoResourceFoundException.class, NoHandlerFoundException.class })
	public ResponseEntity<ErrorResponse> handleNotFound(Exception e) {
		ErrorCode code = ErrorCode.NOT_FOUND;
		return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code, code.getMessage()));
	}

	@ExceptionHandler(HttpRequestMethodNotSupportedException.class)
	public ResponseEntity<ErrorResponse> handleMethodNotAllowed(HttpRequestMethodNotSupportedException e) {
		ErrorCode code = ErrorCode.METHOD_NOT_ALLOWED;
		return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code, code.getMessage()));
	}

	/**
	 * JSON이 아닌 형식으로 보낸 요청.
	 *
	 * 브라우저 <form>은 preflight 없이 바로 요청을 보낼 수 있지만 Content-Type을 세 가지밖에 못 쓴다.
	 * 여기서 거절되므로 다른 사이트의 폼으로 이 API를 실행할 수 없다(CSRF 방어의 한 축).
	 */
	@ExceptionHandler(HttpMediaTypeNotSupportedException.class)
	public ResponseEntity<ErrorResponse> handleUnsupportedMediaType(HttpMediaTypeNotSupportedException e) {
		ErrorCode code = ErrorCode.UNSUPPORTED_MEDIA_TYPE;
		return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code, code.getMessage()));
	}

	/** 예상 못 한 예외. 원인은 로그에만 남기고 사용자에게는 일반 문구를 준다. */
	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleUnknown(Exception e) {
		log.error("처리하지 못한 예외", e);
		ErrorCode code = ErrorCode.INTERNAL_ERROR;
		return ResponseEntity.status(code.getStatus()).body(ErrorResponse.of(code, code.getMessage()));
	}
}
