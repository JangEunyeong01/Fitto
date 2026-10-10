package com.fitto.server.terms;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAgreementRepository extends JpaRepository<UserAgreement, UUID> {

	List<UserAgreement> findAllByUserIdOrderByAgreedAtAsc(UUID userId);
}
