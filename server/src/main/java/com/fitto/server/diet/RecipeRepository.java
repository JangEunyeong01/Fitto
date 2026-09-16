package com.fitto.server.diet;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecipeRepository extends JpaRepository<Recipe, UUID> {

	List<Recipe> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

	Optional<Recipe> findByIdAndUserId(UUID id, UUID userId);
}
