package com.fitto.server.daily;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface DailyWaterRepository extends JpaRepository<DailyWater, UUID> {

	Optional<DailyWater> findByUserIdAndDate(UUID userId, LocalDate date);

	List<DailyWater> findAllByUserIdAndDateBetween(UUID userId, LocalDate from, LocalDate to);

	List<DailyWater> findAllByUserIdAndDateIn(UUID userId, List<LocalDate> dates);
}
