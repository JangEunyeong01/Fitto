package com.fitto.server.workout;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoutineRepository extends JpaRepository<Routine, UUID> {

	List<Routine> findAllByUserIdOrderByName(UUID userId);

	Optional<Routine> findByIdAndUserId(UUID id, UUID userId);

	boolean existsByIdAndUserId(UUID id, UUID userId);

	/** 탈퇴할 때 쓴다. 엔티티를 읽어서 지우므로 routine_exercises도 함께 지워진다. */
	void deleteAllByUserId(UUID userId);
}
