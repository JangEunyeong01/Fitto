package com.fitto.server.user;

import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

/**
 * 탈퇴 사유 한 건. 누가 떠났는지는 일부러 담지 않는다 — user_id도 이메일도 없이 사유와 시각만.
 * 사람을 가리키는 값이 없으니 탈퇴 뒤에 남겨도 개인정보가 아니다.
 */
@Entity
@Table(name = "deletion_reasons")
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class DeletionReasonLog {

	@Id
	private UUID id;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 30)
	private DeletionReason reason;

	@Column(nullable = false)
	private Instant createdAt;

	public static DeletionReasonLog of(DeletionReason reason) {
		DeletionReasonLog log = new DeletionReasonLog();
		log.id = UUID.randomUUID();
		log.reason = reason;
		log.createdAt = Instant.now();
		return log;
	}
}
