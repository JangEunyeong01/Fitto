package com.fitto.server.diet;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MealMemoRepository extends JpaRepository<MealMemo, UUID> {

	Optional<MealMemo> findByUserIdAndDateAndMealType(UUID userId, LocalDate date, MealType mealType);

	List<MealMemo> findAllByUserIdAndDate(UUID userId, LocalDate date);
}
