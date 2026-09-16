package com.fitto.server.diet;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MealItemRepository extends JpaRepository<MealItem, UUID> {

	List<MealItem> findAllByUserIdAndDateOrderByCreatedAt(UUID userId, LocalDate date);

	List<MealItem> findAllByUserIdAndDateBetween(UUID userId, LocalDate from, LocalDate to);

	/** 남의 기록을 ID만 알고 건드리지 못하게, 조회 단계에서 소유자까지 함께 본다. */
	Optional<MealItem> findByIdAndUserId(UUID id, UUID userId);

	List<MealItem> findAllByUserIdAndIdIn(UUID userId, List<UUID> ids);

	/** 최근 먹은 음식(명세 7장). 중복 제거는 서비스에서 한다. */
	List<MealItem> findTop50ByUserIdOrderByCreatedAtDesc(UUID userId);
}
