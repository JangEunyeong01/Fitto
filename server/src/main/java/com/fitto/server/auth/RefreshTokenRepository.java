package com.fitto.server.auth;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

	Optional<RefreshToken> findByTokenHash(String tokenHash);

	/**
	 * 한 사용자의 살아있는 토큰을 전부 폐기한다. 토큰 재사용(탈취 의심)을 감지했을 때 쓴다.
	 *
	 * 별도 트랜잭션으로 돌린다. 감지한 쪽은 폐기 직후 401을 던지는데, 같은 트랜잭션이면
	 * 그 예외에 롤백이 걸려 폐기까지 없던 일이 된다.
	 */
	@Modifying(clearAutomatically = true)
	@Transactional(propagation = Propagation.REQUIRES_NEW)
	@Query("update RefreshToken t set t.revokedAt = :now where t.userId = :userId and t.revokedAt is null")
	int revokeAllByUserId(@Param("userId") UUID userId, @Param("now") Instant now);
}
