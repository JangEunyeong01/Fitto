package com.fitto.server.user;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fitto.server.auth.AttemptCounter;
import com.fitto.server.common.error.ApiException;
import com.fitto.server.common.error.ErrorCode;
import com.fitto.server.diet.RecipeRepository;
import com.fitto.server.period.PeriodDailyRepository;
import com.fitto.server.workout.RoutineRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * 탈퇴(명세 5장).
 *
 * users 한 줄만 지우면 안 된다. user_id를 가진 표는 18개인데 외래키로 users에 묶인 건 6개(질환·알레르기·선호 음식)뿐이라,
 * 나머지 표의 식단·운동·생리 기록은 주인이 사라진 채 DB에 그대로 남는다. 개인정보가 남는 것이므로 표마다 직접 지운다.
 *
 * 표를 새로 만들고 여기에 추가하는 걸 잊으면 조용히 같은 일이 생긴다.
 * AccountServiceTest가 DB에서 user_id 컬럼을 가진 표 목록을 직접 읽어 전부 비었는지 확인한다.
 */
@Service
public class AccountService {

	private static final Logger log = LoggerFactory.getLogger(AccountService.class);

	/**
	 * 자식 표가 없어 한 번에 지워도 되는 것들.
	 * 엔티티 이름이라 표 이름과 다를 수 있다(RefreshToken → refresh_tokens).
	 */
	private static final List<String> SIMPLE_ENTITIES = List.of("MealItem", "MealMemo", "DailyWater", "DailySteps",
			"WeightLog", "Workout", "CustomIngredient", "PeriodSetting", "RefreshToken", "EmailCode");

	/**
	 * 비밀번호 확인 시도 제한.
	 *
	 * 쓰기 요청 제한(분당 300)에는 걸리지만 비밀번호를 찍어보기에는 넉넉한 숫자다.
	 * 남의 기기를 잠깐 쥔 사람이 비밀번호를 맞혀 계정을 지우는 일을 막는다. 비밀번호 변경과 같은 값.
	 */
	private final AttemptCounter deleteAttempts = new AttemptCounter(5, Duration.ofMinutes(10));

	@PersistenceContext
	private EntityManager entityManager;

	private final UserRepository userRepository;
	private final RecipeRepository recipeRepository;
	private final RoutineRepository routineRepository;
	private final PeriodDailyRepository periodDailyRepository;
	private final PasswordEncoder passwordEncoder;

	public AccountService(UserRepository userRepository, RecipeRepository recipeRepository,
			RoutineRepository routineRepository, PeriodDailyRepository periodDailyRepository,
			PasswordEncoder passwordEncoder) {
		this.userRepository = userRepository;
		this.recipeRepository = recipeRepository;
		this.routineRepository = routineRepository;
		this.periodDailyRepository = periodDailyRepository;
		this.passwordEncoder = passwordEncoder;
	}

	@Transactional
	public void delete(UUID userId, String password) {
		if (deleteAttempts.isBlocked(userId.toString())) {
			log.warn("탈퇴 차단(시도 초과): userId={}", userId);
			throw new ApiException(ErrorCode.TOO_MANY_REQUESTS);
		}

		User user = userRepository.findById(userId).orElseThrow(() -> new ApiException(ErrorCode.UNAUTHORIZED));

		if (!passwordEncoder.matches(password, user.getPassword())) {
			deleteAttempts.record(userId.toString());
			log.warn("탈퇴 실패(비밀번호 불일치): userId={}", userId);
			throw new ApiException(ErrorCode.INVALID_CREDENTIALS);
		}

		// 자식 표를 가진 것부터. 엔티티를 읽어서 지워야 재료·세부 운동·증상이 함께 지워진다.
		recipeRepository.deleteAllByUserId(userId);
		routineRepository.deleteAllByUserId(userId);
		periodDailyRepository.deleteAllByUserId(userId);

		for (String entity : SIMPLE_ENTITIES) {
			entityManager.createQuery("delete from " + entity + " e where e.userId = :userId")
					.setParameter("userId", userId)
					.executeUpdate();
		}

		// 마지막에 계정. 질환·알레르기·선호 음식 6개 표는 JPA가 함께 지운다.
		userRepository.delete(user);

		// 지워진 뒤에는 어떤 계정이었는지 확인할 방법이 없다. 삭제 사실 자체는 남겨야 문의에 답할 수 있다.
		log.info("탈퇴 완료: userId={}", userId);
	}
}
