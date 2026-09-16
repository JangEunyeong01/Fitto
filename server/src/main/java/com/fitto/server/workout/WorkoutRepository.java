package com.fitto.server.workout;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WorkoutRepository extends JpaRepository<Workout, UUID> {

	List<Workout> findAllByUserIdAndDateOrderByCreatedAt(UUID userId, LocalDate date);

	List<Workout> findAllByUserIdAndDateBetween(UUID userId, LocalDate from, LocalDate to);

	Optional<Workout> findByIdAndUserId(UUID id, UUID userId);

	List<Workout> findAllByUserIdAndIdIn(UUID userId, List<UUID> ids);
}
