package com.fitto.server.diet;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CustomIngredientRepository extends JpaRepository<CustomIngredient, UUID> {

	List<CustomIngredient> findAllByUserIdOrderByName(UUID userId);

	Optional<CustomIngredient> findByIdAndUserId(UUID id, UUID userId);

	Optional<CustomIngredient> findByUserIdAndName(UUID userId, String name);
}
