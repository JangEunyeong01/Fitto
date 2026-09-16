package com.fitto.server.period;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.AuthenticatedUser;
import com.fitto.server.period.dto.PeriodDailyRequest;
import com.fitto.server.period.dto.PeriodDailyResponse;
import com.fitto.server.period.dto.PeriodPutRequest;
import com.fitto.server.period.dto.PeriodResponse;

import jakarta.validation.Valid;

/** 명세 12장. */
@RestController
@RequestMapping("/period")
public class PeriodController {

	private final PeriodService periodService;

	public PeriodController(PeriodService periodService) {
		this.periodService = periodService;
	}

	@GetMapping
	public PeriodResponse get(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate today) {
		return periodService.get(AuthenticatedUser.requireId(), today);
	}

	@PutMapping
	public PeriodResponse put(@Valid @RequestBody PeriodPutRequest request) {
		return periodService.put(AuthenticatedUser.requireId(), request);
	}

	@PutMapping("/daily/{date}")
	public ResponseEntity<PeriodDailyResponse> putDaily(
			@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
			@Valid @RequestBody PeriodDailyRequest request) {

		PeriodDailyResponse saved = periodService.putDaily(AuthenticatedUser.requireId(), date, request);
		// 모든 값이 비어서 기록을 지운 경우에는 돌려줄 본문이 없다.
		return saved != null ? ResponseEntity.ok(saved) : ResponseEntity.noContent().build();
	}

	@GetMapping("/daily")
	public Map<String, List<PeriodDailyResponse>> getDailyRange(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return Map.of("items", periodService.getDailyRange(AuthenticatedUser.requireId(), from, to));
	}
}
