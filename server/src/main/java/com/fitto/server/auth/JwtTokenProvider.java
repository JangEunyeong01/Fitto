package com.fitto.server.auth;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

import javax.crypto.SecretKey;

import org.springframework.stereotype.Component;

import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;

/**
 * accessToken 발급과 검증.
 * refreshToken은 JWT로 만들되 폐기가 가능해야 해서 DB에도 기록한다(RefreshToken).
 */
@Component
public class JwtTokenProvider {

	private static final String TYPE_CLAIM = "typ";
	private static final String TYPE_ACCESS = "access";
	private static final String TYPE_REFRESH = "refresh";

	private final SecretKey key;
	private final JwtProperties properties;

	public JwtTokenProvider(JwtProperties properties) {
		this.properties = properties;
		this.key = Keys.hmacShaKeyFor(properties.secret().getBytes(StandardCharsets.UTF_8));
	}

	public String createAccessToken(UUID userId) {
		return create(userId, TYPE_ACCESS, properties.accessTtl().toMillis());
	}

	public String createRefreshToken(UUID userId) {
		return create(userId, TYPE_REFRESH, properties.refreshTtl().toMillis());
	}

	private String create(UUID userId, String type, long ttlMillis) {
		Instant now = Instant.now();
		return Jwts.builder()
				.subject(userId.toString())
				.claim(TYPE_CLAIM, type)
				// 같은 사용자가 같은 초에 두 번 발급받아도 토큰 문자열이 겹치지 않게 한다.
				.id(UUID.randomUUID().toString())
				.issuedAt(Date.from(now))
				.expiration(Date.from(now.plusMillis(ttlMillis)))
				.signWith(key)
				.compact();
	}

	/** 서명과 만료를 확인하고 사용자 ID를 꺼낸다. 어긋나면 null. */
	public UUID parseUserId(String token, boolean refresh) {
		try {
			var claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
			String expected = refresh ? TYPE_REFRESH : TYPE_ACCESS;
			// access 토큰으로 갱신을 시도하거나 그 반대인 경우를 막는다.
			if (!expected.equals(claims.get(TYPE_CLAIM, String.class))) {
				return null;
			}
			return UUID.fromString(claims.getSubject());
		} catch (JwtException | IllegalArgumentException e) {
			return null;
		}
	}

	/**
	 * 서명은 맞는데 기한만 지난 토큰인지 확인한다.
	 * 앱이 "다시 로그인"과 "갱신하면 되는 상태"를 구분할 수 있어야 해서 따로 본다(명세 0-6 TOKEN_EXPIRED).
	 */
	public boolean isExpired(String token) {
		try {
			Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
			return false;
		} catch (ExpiredJwtException e) {
			return true;
		} catch (JwtException | IllegalArgumentException e) {
			// 서명이 틀린 토큰은 기한과 상관없이 위조다.
			return false;
		}
	}

	public Instant refreshExpiresAt() {
		return Instant.now().plus(properties.refreshTtl());
	}
}
