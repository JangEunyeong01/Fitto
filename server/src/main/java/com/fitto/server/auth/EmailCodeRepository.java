package com.fitto.server.auth;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface EmailCodeRepository extends JpaRepository<EmailCode, UUID> {

	Optional<EmailCode> findFirstByUserIdAndPurposeOrderByCreatedAtDesc(UUID userId, EmailCode.Purpose purpose);

	@Modifying
	@Query("delete from EmailCode c where c.userId = :userId and c.purpose = :purpose")
	void deleteAllByUserIdAndPurpose(UUID userId, EmailCode.Purpose purpose);
}
