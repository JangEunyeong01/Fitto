package com.fitto.server.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 데이터 초기화(명세 F-043).
 *
 * 탈퇴와 같은 기록 목록을 지우되 계정·로그인·프로필은 남아야 한다.
 * 표 목록은 탈퇴 테스트처럼 DB에 직접 묻는다 — 기록 표가 새로 생겼는데 초기화에서 빠지면 여기서 걸린다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ResetRecordsTest {

	/** 초기화 뒤에도 남아야 하는 표. 계정과 로그인, 약관 동의 이력, 프로필 목록(질환·선호 음식·알레르기). */
	private static final Set<String> KEPT = Set.of("USERS", "REFRESH_TOKENS", "EMAIL_CODES", "USER_AGREEMENTS",
			"USER_DISEASES", "USER_CUSTOM_DISEASES", "USER_PREFERRED_FOODS", "USER_CUSTOM_PREFERRED_FOODS",
			"USER_ALLERGIES", "USER_CUSTOM_ALLERGIES");

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcTemplate jdbc;

	private final ObjectMapper mapper = new ObjectMapper();

	@Test
	void 기록만_지우고_계정과_로그인은_남긴다() throws Exception {
		MvcResult signup = mvc.perform(post("/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "wipe@fitto.app", "password": "fitto1234",
						  "profile": {
						    "name": "초기화", "gender": "female", "age": 30, "height": 160.0, "weight": 52.0,
						    "activityLevel": "light", "goal": "maintain", "personality": "friendly",
						    "diseases": ["diabetes"], "customDiseases": ["직접입력질환"],
						    "preferredFoods": ["chicken"], "customPreferredFoods": ["직접입력음식"],
						    "allergies": ["nuts"], "customAllergies": ["직접입력알레르기"]
						  },
						  "agreements": { "terms": true, "privacy": true, "health": true, "version": "2026-10-01" }
						}
						"""))
				.andReturn();
		assertEquals(201, signup.getResponse().getStatus());
		JsonNode json = mapper.readTree(signup.getResponse().getContentAsString(StandardCharsets.UTF_8));
		String token = json.get("accessToken").asString();
		UUID userId = UUID.fromString(json.get("user").get("userId").asString());

		MvcResult imported = mvc.perform(post("/me/import")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "meals": [{ "id": "a3333333-3333-3333-3333-333333333333", "date": "2026-09-14",
						    "mealType": "lunch", "name": "현미밥", "amount": 1, "unit": "serving", "calories": 310 }],
						  "mealMemos": [{ "date": "2026-09-14", "mealType": "lunch", "memo": "맛있었다" }],
						  "workouts": [{ "id": "a4444444-4444-4444-4444-444444444444", "date": "2026-09-14",
						    "name": "걷기", "duration": 30, "calories": 120 }],
						  "water": [{ "date": "2026-09-14", "amount": 1000 }],
						  "steps": [{ "date": "2026-09-14", "steps": 7000 }],
						  "weights": [{ "date": "2026-09-14", "weight": 52.0 }],
						  "period": {
						    "settings": { "startDate": "2026-09-01", "cycleLength": 28, "periodLength": 5 },
						    "daily": [{ "date": "2026-09-02", "condition": "normal", "symptoms": ["cramps"], "memo": "보통" }],
						    "logs": [{ "startDate": "2026-08-04", "endDate": "2026-08-08" }, { "startDate": "2026-09-01", "endDate": "2026-09-05" }]
						  },
						  "recipes": [{ "id": "a5555555-5555-5555-5555-555555555555", "name": "닭가슴살 덮밥",
						    "ingredients": [{ "name": "닭가슴살", "amount": 100, "calories": 165 }] }],
						  "routines": [{ "id": "a6666666-6666-6666-6666-666666666666", "name": "아침 루틴",
						    "exercises": [{ "name": "걷기", "duration": 20 }] }],
						  "customIngredients": [{ "id": "a7777777-7777-7777-7777-777777777777", "name": "집된장", "calories": 130 }]
						}
						"""))
				.andReturn();
		assertEquals(200, imported.getResponse().getStatus());
		mvc.perform(post("/users/me/email/verification").header("Authorization", "Bearer " + token));

		List<String> tables = userTables();
		for (String table : tables) {
			assertTrue(rowsOf(table, userId) > 0, table + "에 기록이 안 들어갔다");
		}

		MvcResult reset = mvc.perform(delete("/users/me/records").header("Authorization", "Bearer " + token))
				.andReturn();
		assertEquals(204, reset.getResponse().getStatus());

		for (String table : tables) {
			int rows = rowsOf(table, userId);
			if (KEPT.contains(table.toUpperCase())) {
				assertTrue(rows > 0, table + "은 초기화 뒤에도 남아야 한다");
			} else {
				assertEquals(0, rows, table + "에 초기화 전 기록이 남았다");
			}
		}
		assertEquals(0, orphans("recipe_ingredients", "recipe_id", "recipes"));
		assertEquals(0, orphans("routine_exercises", "routine_id", "routines"));
		assertEquals(0, orphans("period_daily_symptoms", "period_daily_id", "period_daily"));

		// 로그인은 그대로라 같은 토큰으로 이어서 쓴다.
		assertEquals(200, mvc.perform(get("/users/me").header("Authorization", "Bearer " + token))
				.andReturn().getResponse().getStatus());
	}

	private List<String> userTables() {
		return jdbc.queryForList("""
				select table_name from information_schema.columns
				where lower(column_name) = 'user_id' and table_schema = 'PUBLIC'
				union
				select 'USERS'
				""", String.class);
	}

	private int rowsOf(String table, UUID userId) {
		String column = "users".equalsIgnoreCase(table) ? "id" : "user_id";
		Integer count = jdbc.queryForObject(
				"select count(*) from " + table + " where " + column + " = ?", Integer.class, userId);
		return count == null ? 0 : count;
	}

	private int orphans(String child, String parentColumn, String parent) {
		Integer count = jdbc.queryForObject(
				"select count(*) from %s c where not exists (select 1 from %s p where p.id = c.%s)"
						.formatted(child, parent, parentColumn),
				Integer.class);
		return count == null ? 0 : count;
	}
}
