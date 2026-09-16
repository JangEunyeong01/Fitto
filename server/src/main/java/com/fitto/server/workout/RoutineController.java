package com.fitto.server.workout;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.AuthenticatedUser;
import com.fitto.server.workout.dto.RoutineRequest;
import com.fitto.server.workout.dto.RoutineResponse;
import com.fitto.server.workout.dto.RoutineUseRequest;
import com.fitto.server.workout.dto.WorkoutResponse;

import jakarta.validation.Valid;

/** 명세 8장 루틴. */
@RestController
@RequestMapping("/routines")
public class RoutineController {

	private final RoutineService routineService;

	public RoutineController(RoutineService routineService) {
		this.routineService = routineService;
	}

	@GetMapping
	public Map<String, List<RoutineResponse>> list() {
		return Map.of("items", routineService.list(AuthenticatedUser.requireId()));
	}

	@PostMapping
	public ResponseEntity<RoutineResponse> save(@Valid @RequestBody RoutineRequest request) {
		return ResponseEntity.status(HttpStatus.CREATED)
				.body(routineService.save(AuthenticatedUser.requireId(), request));
	}

	@PatchMapping("/{routineId}")
	public RoutineResponse update(@PathVariable UUID routineId, @Valid @RequestBody RoutineRequest request) {
		return routineService.update(AuthenticatedUser.requireId(), routineId, request);
	}

	@DeleteMapping("/{routineId}")
	public ResponseEntity<Void> delete(@PathVariable UUID routineId) {
		routineService.delete(AuthenticatedUser.requireId(), routineId);
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/{routineId}/use")
	public ResponseEntity<Map<String, List<WorkoutResponse>>> use(@PathVariable UUID routineId,
			@Valid @RequestBody RoutineUseRequest request) {
		List<WorkoutResponse> created = routineService.use(AuthenticatedUser.requireId(), routineId, request.date());
		return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("items", created));
	}
}
