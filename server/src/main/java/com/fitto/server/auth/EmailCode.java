package com.fitto.server.auth;

import java.time.Instant;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 메일로 보낸 6자리 코드(명세 4-5, 5-4).
 *
 * 코드 원본은 저장하지 않는다. 6자리는 경우의 수가 백만 개뿐이라 해시만 저장해도 DB가 새면
 * 순식간에 되돌릴 수 있다 — 그래서 refreshToken처럼 SHA-256이 아니라 BCrypt(솔트 + 느린 함수)로 저장한다.
 *
 * 맞히면 행을 지운다. 새로 받으면 같은 용도의 이전 코드도 지운다. 살아 있는 코드는 사람·용도당 하나다.
 */
@Entity
@Table(name = "email_codes", indexes = @Index(name = "idx_email_code_user", columnList = "user_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class EmailCode {

	public enum Purpose {
		RESET_PASSWORD,
		VERIFY_EMAIL
	}

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Purpose purpose;

	@Column(nullable = false, length = 60)
	private String codeHash;

	@Column(nullable = false)
	private Instant expiresAt;

	/** 틀린 횟수. 한도를 넘으면 맞는 코드를 넣어도 받지 않는다. */
	@Column(nullable = false)
	private int attempts;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	public static EmailCode issue(UUID userId, Purpose purpose, String codeHash, Instant expiresAt) {
		EmailCode code = new EmailCode();
		code.id = UUID.randomUUID();
		code.userId = userId;
		code.purpose = purpose;
		code.codeHash = codeHash;
		code.expiresAt = expiresAt;
		return code;
	}

	public boolean isUsable(Instant now, int maxAttempts) {
		return attempts < maxAttempts && expiresAt.isAfter(now);
	}

	public void recordFailure() {
		this.attempts++;
	}
}
