package com.fitto.server.daily;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface WeightLogRepository extends JpaRepository<WeightLog, UUID> {

	Optional<WeightLog> findByUserIdAndDate(UUID userId, LocalDate date);

	List<WeightLog> findAllByUserIdAndDateBetweenOrderByDate(UUID userId, LocalDate from, LocalDate to);

	List<WeightLog> findAllByUserIdAndDateIn(UUID userId, List<LocalDate> dates);

	/** 가장 최근 체중. 체중을 기록하면 목표를 다시 계산해야 하는지 판단할 때 쓴다(명세 2-6). */
	Optional<WeightLog> findTopByUserIdOrderByDateDesc(UUID userId);
}
