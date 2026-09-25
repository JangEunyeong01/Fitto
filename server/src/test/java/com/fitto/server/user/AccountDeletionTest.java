package com.fitto.server.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
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
 * 탈퇴와 비밀번호 변경(명세 5장).
 *
 * 탈퇴는 "지워졌는지"보다 "빠짐없이 지워졌는지"가 중요하다. user_id를 가진 표는 18개인데
 * 외래키로 users에 묶인 건 6개뿐이라, 삭제 코드에서 빠진 표는 아무 오류 없이 기록을 남긴다.
 * 그래서 표 목록을 손으로 적지 않고 DB에 직접 물어본다 — 표가 늘면 이 테스트가 먼저 실패한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class AccountDeletionTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private JdbcTemplate jdbc;

	private final ObjectMapper mapper = new ObjectMapper();

	private static String accessToken;
	private static String refreshToken;
	private static UUID userId;

	private JsonNode body(MvcResult result) throws Exception {
		return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
	}

	@Test
	@Order(1)
	void 가입하고_모든_종류의_기록을_남긴다() throws Exception {
		MvcResult signup = mvc.perform(post("/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "bye@fitto.app",
						  "password": "fitto1234",
						  "profile": {
						    "name": "탈퇴", "gender": "female", "age": 30, "height": 160.0, "weight": 52.0,
						    "activityLevel": "light", "goal": "maintain", "personality": "friendly",
						    "diseases": ["diabetes"], "customDiseases": ["직접입력질환"],
						    "preferredFoods": ["chicken"], "customPreferredFoods": ["직접입력음식"],
						    "allergies": ["nuts"], "customAllergies": ["직접입력알레르기"]
						  }
						}
						"""))
				.andReturn();

		assertEquals(201, signup.getResponse().getStatus());
		JsonNode json = body(signup);
		accessToken = json.get("accessToken").asString();
		refreshToken = json.get("refreshToken").asString();
		userId = UUID.fromString(json.get("user").get("userId").asString());

		// 한 번에 모든 표를 채운다. 개별 API로 하나씩 넣으면 표가 늘 때 여기에 추가하는 걸 또 잊는다.
		MvcResult imported = mvc.perform(post("/me/import")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "meals": [{
						    "id": "33333333-3333-3333-3333-333333333333", "date": "2026-09-14",
						    "mealType": "lunch", "name": "현미밥", "amount": 1, "unit": "serving", "calories": 310
						  }],
						  "mealMemos": [{ "date": "2026-09-14", "mealType": "lunch", "memo": "맛있었다" }],
						  "workouts": [{
						    "id": "44444444-4444-4444-4444-444444444444", "date": "2026-09-14",
						    "name": "걷기", "duration": 30, "calories": 120
						  }],
						  "water": [{ "date": "2026-09-14", "amount": 1000 }],
						  "steps": [{ "date": "2026-09-14", "steps": 7000 }],
						  "weights": [{ "date": "2026-09-14", "weight": 52.0 }],
						  "period": {
						    "settings": { "startDate": "2026-09-01", "cycleLength": 28, "periodLength": 5 },
						    "daily": [{ "date": "2026-09-02", "condition": "normal", "symptoms": ["cramps"], "memo": "보통" }]
						  },
						  "recipes": [{
						    "id": "55555555-5555-5555-5555-555555555555", "name": "닭가슴살 덮밥",
						    "ingredients": [{ "name": "닭가슴살", "amount": 100, "calories": 165 }]
						  }],
						  "routines": [{
						    "id": "66666666-6666-6666-6666-666666666666", "name": "아침 루틴",
						    "exercises": [{ "name": "걷기", "duration": 20 }]
						  }],
						  "customIngredients": [{
						    "id": "77777777-7777-7777-7777-777777777777", "name": "집된장", "calories": 130
						  }]
						}
						"""))
				.andReturn();

		assertEquals(200, imported.getResponse().getStatus());

		// 가져오기에 안 들어가는 표. 이메일 인증 코드를 한 번 받아 둔다(테스트 설정은 메일 대신 로그에 찍는다).
		MvcResult verification = mvc.perform(post("/users/me/email/verification")
				.header("Authorization", "Bearer " + accessToken))
				.andReturn();
		assertEquals(204, verification.getResponse().getStatus());

		// 정말로 들어갔는지 확인하고 시작한다. 비어 있는 상태로 지우면 테스트가 통과해도 의미가 없다.
		for (String table : userTables()) {
			assertTrue(rowsOf(table) > 0, table + "에 기록이 안 들어갔다. 이 표는 탈퇴 검증에서 빠진다");
		}
	}

	@Test
	@Order(2)
	void 비밀번호가_틀리면_아무것도_지워지지_않는다() throws Exception {
		MvcResult result = mvc.perform(delete("/users/me")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"password\": \"wrong1234\" }"))
				.andReturn();

		assertEquals(401, result.getResponse().getStatus());
		assertEquals("INVALID_CREDENTIALS", body(result).get("code").asString());
		assertTrue(rowsOf("users") > 0);
		assertTrue(rowsOf("meal_items") > 0);
	}

	@Test
	@Order(3)
	void 비밀번호를_바꾸면_예전_refreshToken은_막힌다() throws Exception {
		MvcResult changed = mvc.perform(patch("/users/me/password")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"currentPassword\": \"fitto1234\", \"newPassword\": \"fitto5678\" }"))
				.andReturn();

		assertEquals(200, changed.getResponse().getStatus());

		// 바꾼 기기는 새 토큰으로 계속 쓴다.
		JsonNode tokens = body(changed);
		assertEquals(200, mvc.perform(get("/users/me")
				.header("Authorization", "Bearer " + tokens.get("accessToken").asString()))
				.andReturn().getResponse().getStatus());

		// 다른 기기가 들고 있던 토큰은 막힌다.
		MvcResult refreshed = mvc.perform(post("/auth/refresh")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"refreshToken\": \"%s\" }".formatted(refreshToken)))
				.andReturn();
		assertEquals(401, refreshed.getResponse().getStatus());

		accessToken = tokens.get("accessToken").asString();
	}

	@Test
	@Order(4)
	void 현재_비밀번호가_틀리면_바뀌지_않는다() throws Exception {
		MvcResult result = mvc.perform(patch("/users/me/password")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"currentPassword\": \"fitto1234\", \"newPassword\": \"another1234\" }"))
				.andReturn();

		assertEquals(401, result.getResponse().getStatus());
		assertEquals("INVALID_CREDENTIALS", body(result).get("code").asString());
	}

	@Test
	@Order(5)
	void 탈퇴하면_user_id를_가진_모든_표에서_사라진다() throws Exception {
		MvcResult result = mvc.perform(delete("/users/me")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"password\": \"fitto5678\" }"))
				.andReturn();

		assertEquals(204, result.getResponse().getStatus());

		for (String table : userTables()) {
			assertEquals(0, rowsOf(table), table + "에 탈퇴한 사용자의 기록이 남았다");
		}

		// user_id가 없는 자식 표는 위 검사에 안 걸린다. 부모가 사라졌는데 남아 있지 않은지 따로 본다.
		assertEquals(0, orphans("recipe_ingredients", "recipe_id", "recipes"));
		assertEquals(0, orphans("routine_exercises", "routine_id", "routines"));
		assertEquals(0, orphans("period_daily_symptoms", "period_daily_id", "period_daily"));

		// 토큰은 살아 있지만 계정이 없다. 남은 토큰으로 다른 사람 기록을 보는 일이 없어야 한다.
		assertEquals(401, mvc.perform(get("/users/me")
				.header("Authorization", "Bearer " + accessToken))
				.andReturn().getResponse().getStatus());
	}

	@Test
	@Order(6)
	void 탈퇴한_이메일로_다시_가입할_수_있다() throws Exception {
		MvcResult result = mvc.perform(post("/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "bye@fitto.app", "password": "fitto1234",
						  "profile": { "name": "다시", "gender": "female", "age": 30, "height": 160.0,
						    "weight": 52.0, "activityLevel": "light", "goal": "maintain", "personality": "friendly" }
						}
						"""))
				.andReturn();

		assertEquals(201, result.getResponse().getStatus());

		// 예전 기록이 딸려오지 않는다. 같은 이메일이라도 새 계정이다.
		JsonNode json = body(result);
		userId = UUID.fromString(json.get("user").get("userId").asString());
		assertFalse(rowsOf("meal_items") > 0);
		assertEquals(52.0, json.get("user").get("weight").asDouble());
	}

	/** DB에게 직접 묻는다. 표가 새로 생기면 목록에 자동으로 들어온다. */
	private List<String> userTables() {
		return jdbc.queryForList("""
				select table_name from information_schema.columns
				where lower(column_name) = 'user_id' and table_schema = 'PUBLIC'
				union
				select 'users'
				""", String.class);
	}

	private int rowsOf(String table) {
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
