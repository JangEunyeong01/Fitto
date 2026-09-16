package com.fitto.server.period;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface PeriodDailyRepository extends JpaRepository<PeriodDaily, UUID> {

	Optional<PeriodDaily> findByUserIdAndDate(UUID userId, LocalDate date);

	List<PeriodDaily> findAllByUserIdAndDateBetweenOrderByDate(UUID userId, LocalDate from, LocalDate to);

	List<PeriodDaily> findAllByUserIdAndDateIn(UUID userId, List<LocalDate> dates);
}
