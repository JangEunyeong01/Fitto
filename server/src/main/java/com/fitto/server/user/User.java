package com.fitto.server.user;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.Column;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

/**
 * 계정과 프로필(명세 5장 User).
 * 테이블 이름이 users인 이유는 user가 PostgreSQL 예약어라서다.
 *
 * 목록 필드를 코드(diseases)와 직접 입력(customDiseases)으로 나눠 담는다.
 * 한 칸에 섞으면 어느 쪽이 코드인지 구분할 수 없어 추천·주의 규칙을 못 돌린다.
 *
 * 직접 입력 목록의 컬럼 이름이 item인 이유: value는 H2 예약어라 테이블 생성이 조용히 실패한다.
 * Postgres에서는 통과해서 실제 호출로는 못 잡았고, H2 통합 테스트에서 드러났다.
 */
@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

	@Id
	private UUID id;

	@Column(nullable = false, unique = true, length = 254)
	private String email;

	/** BCrypt 해시. 평문은 어디에도 남기지 않는다. */
	@Column(nullable = false)
	private String password;

	@Column(nullable = false, length = 30)
	private String name;

	@Enumerated(EnumType.STRING)
	@Column(length = 10)
	private Gender gender;

	private Integer age;

	private Double height;

	private Double weight;

	private Double targetWeight;

	/** 생일은 월·일만 받는다. 나이는 age로 따로 받으므로 연도가 필요 없다. */
	private Integer birthdayMonth;

	private Integer birthdayDay;

	@Enumerated(EnumType.STRING)
	@Column(length = 20)
	private ActivityLevel activityLevel;

	@Enumerated(EnumType.STRING)
	@Column(length = 20)
	private Goal goal;

	@ElementCollection
	@CollectionTable(name = "user_diseases", joinColumns = @JoinColumn(name = "user_id"))
	@Column(name = "code", length = 30)
	private List<String> diseases = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "user_custom_diseases", joinColumns = @JoinColumn(name = "user_id"))
	@Column(name = "item", length = 30)
	private List<String> customDiseases = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "user_preferred_foods", joinColumns = @JoinColumn(name = "user_id"))
	@Column(name = "code", length = 30)
	private List<String> preferredFoods = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "user_custom_preferred_foods", joinColumns = @JoinColumn(name = "user_id"))
	@Column(name = "item", length = 30)
	private List<String> customPreferredFoods = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "user_allergies", joinColumns = @JoinColumn(name = "user_id"))
	@Column(name = "code", length = 30)
	private List<String> allergies = new ArrayList<>();

	@ElementCollection
	@CollectionTable(name = "user_custom_allergies", joinColumns = @JoinColumn(name = "user_id"))
	@Column(name = "item", length = 30)
	private List<String> customAllergies = new ArrayList<>();

	@Enumerated(EnumType.STRING)
	@Column(nullable = false, length = 20)
	private Personality personality;

	@Embedded
	private WorkoutPreference workoutPreference;

	@Column(nullable = false)
	private boolean periodEnabled;

	@Embedded
	private Goals goals;

	/**
	 * 앱을 쓰기 시작한 시점(명세 F-008).
	 * 게스트로 쓰다 가입하면 기기에서 올려준 값으로 덮어써 "함께한 지 N일"이 1일로 되돌아가지 않게 한다.
	 */
	@Column(nullable = false)
	private Instant startedAt;

	@CreationTimestamp
	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@UpdateTimestamp
	@Column(nullable = false)
	private Instant updatedAt;

	public static User create(String email, String encodedPassword, String name) {
		User user = new User();
		user.id = UUID.randomUUID();
		user.email = email;
		user.password = encodedPassword;
		user.name = name;
		user.personality = Personality.FRIENDLY;
		user.workoutPreference = WorkoutPreference.initial();
		user.goals = Goals.initial();
		user.periodEnabled = false;
		user.startedAt = Instant.now();
		return user;
	}

	public void changeStartedAt(Instant startedAt) {
		this.startedAt = startedAt;
	}

	/** 체중 기록이 갱신되면 프로필의 현재 체중도 따라간다(명세 2-6). */
	public void changeWeight(double weight) {
		this.weight = weight;
	}

	public void changePeriodEnabled(boolean enabled) {
		this.periodEnabled = enabled;
	}

	/** 온보딩에서 받은 프로필을 한 번에 채운다. 목표 계산은 호출한 쪽에서 이어서 한다. */
	public void applyProfile(String name, Gender gender, Integer age, Double height, Double weight,
			Double targetWeight, ActivityLevel activityLevel, Goal goal, Personality personality,
			Integer birthdayMonth, Integer birthdayDay) {
		this.name = name;
		this.gender = gender;
		this.age = age;
		this.height = height;
		this.weight = weight;
		this.targetWeight = targetWeight;
		this.activityLevel = activityLevel;
		this.goal = goal;
		this.personality = personality;
		this.birthdayMonth = birthdayMonth;
		this.birthdayDay = birthdayDay;
	}

	/**
	 * 목록 필드를 통째로 갈아끼운다.
	 * null이면 그 목록은 건드리지 않는다 — PATCH에서 안 보낸 필드를 비우지 않기 위해서다.
	 */
	public void replaceTagLists(List<String> diseases, List<String> customDiseases, List<String> preferredFoods,
			List<String> customPreferredFoods, List<String> allergies, List<String> customAllergies) {
		replace(this.diseases, diseases);
		replace(this.customDiseases, customDiseases);
		replace(this.preferredFoods, preferredFoods);
		replace(this.customPreferredFoods, customPreferredFoods);
		replace(this.allergies, allergies);
		replace(this.customAllergies, customAllergies);
	}

	// 컬렉션 인스턴스를 바꾸지 않고 내용만 교체한다. JPA가 추적 중인 컬렉션을 통째로 갈면 예외가 난다.
	private static void replace(List<String> target, List<String> next) {
		if (next == null) {
			return;
		}
		target.clear();
		target.addAll(next);
	}
}
