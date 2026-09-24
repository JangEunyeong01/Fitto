package com.fitto.server.common;

import java.io.IOException;

import org.springframework.core.annotation.Order;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.common.error.ErrorResponse;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.ObjectMapper;

/**
 * 너무 큰 요청 본문을 읽기 전에 자른다(명세 0-6 PAYLOAD_TOO_LARGE).
 *
 * JSON 본문에는 기본 제한이 없다. spring.servlet.multipart 설정은 파일 업로드에만,
 * max-http-form-post-size는 폼 전송에만 걸린다. 막지 않으면 요청 하나가
 * 본문 크기만큼 메모리를 쓰고, 그만큼을 파싱하는 데 CPU를 쓴다.
 *
 * 인증보다 먼저 돌린다. 토큰 없이 보내는 공격도 막아야 해서다.
 */
@Component
@Order(Integer.MIN_VALUE)
public class PayloadSizeFilter extends OncePerRequestFilter {

	/** 게스트 데이터 한 번에 올리기(명세 6장)가 가장 큰 요청이다. 그것도 이 근처에 못 간다. */
	private static final long MAX_BYTES = 5L * 1024 * 1024;

	private final ObjectMapper objectMapper;

	public PayloadSizeFilter(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {

		long length = request.getContentLengthLong();

		// 길이를 안 밝히고 보내는 경우(청크 전송)는 받지 않는다. 크기를 미리 알 수 없어 위 검사를 빠져나간다.
		// 앱의 fetch는 본문이 있으면 항상 Content-Length를 붙인다.
		//
		// 청크 전송인지는 Transfer-Encoding으로 본다. 예전엔 "길이 없는 POST"를 전부 막았는데,
		// 본문 없는 POST(이메일 인증 코드 보내기)까지 413으로 걸렸다. HTTP에서 본문은 Content-Length나
		// Transfer-Encoding이 있을 때만 존재하므로, 둘 다 없으면 본문이 없는 요청이다.
		boolean unknownLength = length < 0 && hasBody(request) && isChunked(request);

		if (length > MAX_BYTES || unknownLength) {
			response.setStatus(ErrorCode.PAYLOAD_TOO_LARGE.getStatus().value());
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			response.setCharacterEncoding("UTF-8");
			objectMapper.writeValue(response.getWriter(),
					ErrorResponse.of(ErrorCode.PAYLOAD_TOO_LARGE, ErrorCode.PAYLOAD_TOO_LARGE.getMessage()));
			return;
		}

		chain.doFilter(request, response);
	}

	private static boolean isChunked(HttpServletRequest request) {
		String encoding = request.getHeader("Transfer-Encoding");
		return encoding != null && encoding.toLowerCase().contains("chunked");
	}

	private static boolean hasBody(HttpServletRequest request) {
		String method = request.getMethod();
		return "POST".equals(method) || "PUT".equals(method) || "PATCH".equals(method);
	}
}
