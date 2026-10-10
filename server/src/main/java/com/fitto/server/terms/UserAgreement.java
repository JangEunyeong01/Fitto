package com.fitto.server.terms;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 약관 동의 이력 한 줄. 이용약관·개인정보·건강 정보 셋을 한꺼번에 동의하므로 시각은 하나.
 * users의 terms_version은 "마지막 동의"만 남아서, 누가 언제 어느 버전에 동의했는지는 여기서 본다.
 * 탈퇴하면 함께 지운다(AccountService), 데이터 초기화로는 지우지 않는다.
 */
@Entity
@Table(name = "user_agreements")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class UserAgreement {

	@Id
	private UUID id;

	@Column(name = "user_id", nullable = false)
	private UUID userId;

	@Column(nullable = false, length = 20)
	private String version;

	@Column(nullable = false)
	private Instant agreedAt;

	public static UserAgreement of(UUID userId, String version, Instant agreedAt) {
		UserAgreement a = new UserAgreement();
		a.id = UUID.randomUUID();
		a.userId = userId;
		a.version = version;
		a.agreedAt = agreedAt;
		return a;
	}
}
