package com.fitto.server.diet;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RecipeRepository extends JpaRepository<Recipe, UUID> {

	List<Recipe> findAllByUserIdOrderByCreatedAtDesc(UUID userId);

	Optional<Recipe> findByIdAndUserId(UUID id, UUID userId);

	boolean existsByIdAndUserId(UUID id, UUID userId);

	/**
	 * 탈퇴할 때 쓴다. 엔티티를 읽어서 지우므로 recipe_ingredients도 함께 지워진다.
	 * JPQL로 한 번에 지우면 재료가 주인 없이 남는다.
	 */
	void deleteAllByUserId(UUID userId);
}
