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

	/** 탈퇴할 때 쓴다. 엔티티를 읽어서 지우므로 period_daily_symptoms도 함께 지워진다. */
	void deleteAllByUserId(UUID userId);
}
