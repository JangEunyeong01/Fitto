package com.fitto.server.auth;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 발급한 refreshToken 기록(명세 0-4).
 *
 * 토큰 문자열 자체가 아니라 해시를 저장한다. DB가 유출돼도 그 값으로 로그인할 수 없게 하려는 것이다.
 * 갱신할 때마다 새로 발급(로테이션)하고, 이미 쓴 토큰이 다시 오면 탈취로 보고 그 사용자의 토큰을 전부 폐기한다.
 */
@Entity
@Table(name = "refresh_tokens", indexes = @Index(name = "idx_refresh_token_user", columnList = "user_id"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RefreshToken {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false, unique = true, length = 64)
	private String tokenHash;

	@Column(nullable = false)
	private Instant expiresAt;

	/** 갱신에 한 번 쓰이면 채워진다. 값이 있는 토큰이 다시 오면 재사용(탈취)으로 본다. */
	private Instant usedAt;

	/** 로그아웃하거나 탈취가 의심돼 전부 폐기할 때 채워진다. */
	private Instant revokedAt;

	public static RefreshToken issue(UUID userId, String tokenHash, Instant expiresAt) {
		RefreshToken token = new RefreshToken();
		token.id = UUID.randomUUID();
		token.userId = userId;
		token.tokenHash = tokenHash;
		token.expiresAt = expiresAt;
		return token;
	}

	public boolean isUsable(Instant now) {
		return usedAt == null && revokedAt == null && expiresAt.isAfter(now);
	}

	public void markUsed() {
		this.usedAt = Instant.now();
	}

	public void revoke() {
		this.revokedAt = Instant.now();
	}
}
