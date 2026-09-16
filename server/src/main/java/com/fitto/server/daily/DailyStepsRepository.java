package com.fitto.server.daily;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyStepsRepository extends JpaRepository<DailySteps, UUID> {

	Optional<DailySteps> findByUserIdAndDate(UUID userId, LocalDate date);

	List<DailySteps> findAllByUserIdAndDateBetween(UUID userId, LocalDate from, LocalDate to);

	List<DailySteps> findAllByUserIdAndDateIn(UUID userId, List<LocalDate> dates);
}
