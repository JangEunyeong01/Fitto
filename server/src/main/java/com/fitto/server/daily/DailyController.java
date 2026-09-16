package com.fitto.server.daily;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.AuthenticatedUser;
import com.fitto.server.daily.dto.StepsItem;
import com.fitto.server.daily.dto.StepsPutRequest;
import com.fitto.server.daily.dto.WaterPutRequest;
import com.fitto.server.daily.dto.WaterResponse;
import com.fitto.server.daily.dto.WeightPutRequest;

import jakarta.validation.Valid;

/**
 * 수분·걸음수·체중 (명세 9~11장).
 * 세 리소스를 한 컨트롤러에 둔 이유는 저장 방식("날짜당 값 하나, 절댓값 덮어쓰기")이 같아서다.
 */
@RestController
public class DailyController {

	private final DailyService dailyService;

	public DailyController(DailyService dailyService) {
		this.dailyService = dailyService;
	}

	@GetMapping("/water")
	public WaterResponse getWater(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		return dailyService.getWater(AuthenticatedUser.requireId(), date);
	}

	@PutMapping("/water")
	public WaterResponse putWater(@Valid @RequestBody WaterPutRequest request) {
		return dailyService.putWater(AuthenticatedUser.requireId(), request.date(), request.amount());
	}

	@GetMapping("/steps")
	public DailyService.StepsRange getSteps(
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return dailyService.getSteps(AuthenticatedUser.requireId(), from, to);
	}

	@PutMapping("/steps")
	public Map<String, List<StepsItem>> putSteps(@Valid @RequestBody StepsPutRequest request) {
		return Map.of("items", dailyService.putSteps(AuthenticatedUser.requireId(), request.items()));
	}

	@GetMapping("/weights")
	public DailyService.WeightRange getWeights(
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
			@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
		return dailyService.getWeights(AuthenticatedUser.requireId(), from, to);
	}

	@PutMapping("/weights/{date}")
	public DailyService.WeightPutResult putWeight(
			@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
			@Valid @RequestBody WeightPutRequest request) {
		return dailyService.putWeight(AuthenticatedUser.requireId(), date, request.weight());
	}

	@DeleteMapping("/weights/{date}")
	public ResponseEntity<Void> deleteWeight(
			@PathVariable @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
		dailyService.deleteWeight(AuthenticatedUser.requireId(), date);
		return ResponseEntity.noContent().build();
	}
}
