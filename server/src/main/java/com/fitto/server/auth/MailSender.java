package com.fitto.server.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.fitto.server.common.LogMask;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;

/**
 * 코드 메일 발송.
 *
 * 아직 메일 서비스를 붙이지 않았다. 무료 서버(Render)는 SMTP 포트가 막혀 있어 HTTP 메일 API(Resend 등)를 써야 하고,
 * 그러려면 보내는 도메인이 있어야 한다. 도메인을 정하면 이 클래스 안에서 API를 부르도록 바꾼다.
 *
 * 그때까지는 **로컬에서만** 코드를 서버 로그에 찍는다(`fitto.mail.log-codes: true`).
 * 운영에서는 절대 켜지 않는다 — 로그를 볼 수 있는 사람이면 누구든 남의 비밀번호를 바꿀 수 있게 된다.
 * 운영에서 메일 서비스 없이 부르면 발송 불가로 거절한다.
 */
@Component
public class MailSender {

	private static final Logger log = LoggerFactory.getLogger(MailSender.class);

	private final boolean logCodes;

	public MailSender(@Value("${fitto.mail.log-codes:false}") boolean logCodes) {
		this.logCodes = logCodes;
	}

	public void sendCode(String email, EmailCode.Purpose purpose, String code) {
		if (!logCodes) {
			throw new ApiException(ErrorCode.MAIL_UNAVAILABLE);
		}
		// 로컬 전용. 이메일은 가려도 코드는 그대로 찍어야 개발할 때 쓸 수 있다.
		log.info("[로컬 메일] {} 코드 {} → {}", purpose, code, LogMask.email(email));
	}
}
