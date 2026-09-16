package com.fitto.server.workout;

import java.time.LocalDate;
import java.util.UUID;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.AuthenticatedUser;
import com.fitto.server.workout.dto.WorkoutCreateRequest;
import com.fitto.server.workout.dto.WorkoutPatchRequest;
import com.fitto.server.workout.dto.WorkoutResponse;

import jakarta.validation.Valid;

/** 명세 8장. */
@RestController
@RequestMapping("/workout")
public class WorkoutController {

	private final WorkoutService workoutService;

	public WorkoutController(WorkoutService workoutService) {
		this.workoutService = workoutService;
	}

	@GetMapping
	public WorkoutService.DayResult getDay(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return workoutService.getDay(AuthenticatedUser.requireId(), date);
	}

	@PostMapping
	public ResponseEntity<WorkoutResponse> add(@Valid @RequestBody WorkoutCreateRequest request) {
		var result = workoutService.add(AuthenticatedUser.requireId(), request);
		return ResponseEntity.status(result.created() ? HttpStatus.CREATED : HttpStatus.OK).body(result.body());
	}

	@PatchMapping("/{workoutId}")
	public WorkoutResponse patch(@PathVariable UUID workoutId, @Valid @RequestBody WorkoutPatchRequest request) {
		return workoutService.patch(AuthenticatedUser.requireId(), workoutId, request);
	}

	@DeleteMapping("/{workoutId}")
	public ResponseEntity<Void> delete(@PathVariable UUID workoutId) {
		workoutService.delete(AuthenticatedUser.requireId(), workoutId);
		return ResponseEntity.noContent().build();
	}
}
