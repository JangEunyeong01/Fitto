package com.fitto.server;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.MethodOrderer;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestMethodOrder;
import org.springframework.beans.factory.annotation.Autowired;
// Boot 4에서 테스트 자동설정 패키지가 모듈별로 나뉘었다(...test.autoconfigure.web.servlet → ...webmvc.test.autoconfigure).
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 가입부터 기록까지 실제로 이어지는지 확인하는 통합 테스트.
 *
 * 단위 테스트는 계산식만 봤고, 스프링 컨텍스트가 뜨는지·JPA 매핑이 맞는지는 확인한 적이 없었다.
 * 엔티티가 서른 개 가까이 되는데 테이블 생성이 안 되는 실수는 컴파일로는 안 잡힌다.
 *
 * 한 사용자의 흐름을 순서대로 따라가므로 테스트 순서를 고정한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ApiFlowTest {

	@Autowired
	private MockMvc mvc;

	private final ObjectMapper mapper = new ObjectMapper();

	/** 가입할 때 받은 토큰. 뒤 테스트들이 이어서 쓴다. */
	private static String accessToken;

	private JsonNode body(MvcResult result) throws Exception {
		return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
	}

	@Test
	@Order(1)
	void 가입하면_목표가_계산돼_돌아온다() throws Exception {
		// 명세 2-1의 예시와 같은 프로필: female, 26세, 165cm, 55kg, light, lose_weight → 1424kcal / 1800ml
		String request = """
				{
				  "email": "flow@fitto.app",
				  "password": "fitto1234",
				  "profile": {
				    "name": "은영", "gender": "female", "age": 26, "height": 165.0, "weight": 55.0,
				    "targetWeight": 52.0, "activityLevel": "light", "goal": "lose_weight",
				    "diseases": ["diabetes"], "customDiseases": [], "preferredFoods": [], "customPreferredFoods": [],
				    "allergies": ["nuts"], "customAllergies": ["오이"], "personality": "friendly"
				  },
				  "startedAt": "2026-08-01T09:00:00Z"
				}
				""";

		MvcResult result = mvc.perform(post("/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
				.andReturn();

		assertEquals(201, result.getResponse().getStatus());

		JsonNode json = body(result);
		accessToken = json.get("accessToken").asString();

		JsonNode user = json.get("user");
		assertEquals("flow@fitto.app", user.get("email").asString());
		assertEquals(1424, user.get("goals").get("targetCalorie").asInt());
		assertEquals(1800, user.get("goals").get("waterGoal").asInt());
		// 코드값은 소문자로 나간다(명세 1장).
		assertEquals("female", user.get("gender").asString());
		assertEquals("lose_weight", user.get("goal").asString());
		// 게스트로 쓴 기간을 이어받는다(F-008).
		assertTrue(user.get("startedAt").asString().startsWith("2026-08-01"));
	}

	@Test
	@Order(2)
	void 같은_이메일로_또_가입하면_409다() throws Exception {
		String request = """
				{
				  "email": "flow@fitto.app", "password": "fitto1234",
				  "profile": { "name": "은영", "gender": "female", "age": 26, "height": 165.0, "weight": 55.0,
				    "activityLevel": "light", "goal": "lose_weight", "personality": "friendly" }
				}
				""";

		MvcResult result = mvc.perform(post("/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
				.andReturn();

		assertEquals(409, result.getResponse().getStatus());
		assertEquals("EMAIL_DUPLICATED", body(result).get("code").asString());
	}

	@Test
	@Order(3)
	void 토큰_없이_부르면_401이다() throws Exception {
		assertEquals(401, mvc.perform(get("/users/me")).andReturn().getResponse().getStatus());
	}

	@Test
	@Order(4)
	void 음식을_기록하고_날짜로_조회한다() throws Exception {
		String mealId = "11111111-1111-1111-1111-111111111111";
		String request = """
				{
				  "id": "%s", "date": "2026-09-12", "mealType": "lunch", "name": "현미밥",
				  "amount": 1, "unit": "serving", "servingLabel": "1공기 210g", "calories": 310
				}
				""".formatted(mealId);

		MvcResult created = mvc.perform(post("/diet")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
				.andReturn();
		assertEquals(201, created.getResponse().getStatus());

		// 같은 id로 다시 보내면 새로 만들지 않고 200이다(명세 0-2 멱등).
		MvcResult again = mvc.perform(post("/diet")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
				.andReturn();
		assertEquals(200, again.getResponse().getStatus());

		MvcResult day = mvc.perform(get("/diet?date=2026-09-12")
				.header("Authorization", "Bearer " + accessToken))
				.andReturn();

		JsonNode json = body(day);
		assertEquals(310, json.get("totalCalories").asInt());
		assertEquals(1, json.get("meals").get("lunch").size());
		// 기록이 없는 끼니도 키는 있다.
		assertEquals(0, json.get("meals").get("breakfast").size());
	}

	@Test
	@Order(5)
	void 수분은_절댓값으로_덮어쓴다() throws Exception {
		for (int amount : new int[] { 500, 1250 }) {
			mvc.perform(put("/water")
					.header("Authorization", "Bearer " + accessToken)
					.contentType(MediaType.APPLICATION_JSON)
					.content("{ \"date\": \"2026-09-12\", \"amount\": %d }".formatted(amount)))
					.andReturn();
		}

		MvcResult result = mvc.perform(get("/water?date=2026-09-12")
				.header("Authorization", "Bearer " + accessToken))
				.andReturn();

		JsonNode json = body(result);
		// 두 번 보냈지만 더해지지 않는다.
		assertEquals(1250, json.get("amount").asInt());
		assertEquals(1800, json.get("goal").asInt());
		assertEquals(69, json.get("percentage").asInt());
	}

	@Test
	@Order(6)
	void 주기_설정_전_조회는_404다() throws Exception {
		MvcResult result = mvc.perform(get("/period?today=2026-09-12")
				.header("Authorization", "Bearer " + accessToken))
				.andReturn();

		assertEquals(404, result.getResponse().getStatus());
		assertEquals("PERIOD_NOT_SET", body(result).get("code").asString());
	}

	@Test
	@Order(7)
	void 주기를_설정하면_예정일이_계산된다() throws Exception {
		MvcResult result = mvc.perform(put("/period")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{ "startDate": "2026-09-05", "cycleLength": 30, "periodLength": 5, "today": "2026-09-12" }
						"""))
				.andReturn();

		JsonNode json = body(result);
		assertEquals("2026-10-05", json.get("nextPeriod").asString());
		assertEquals("2026-09-21", json.get("ovulation").asString());
		assertEquals("2026-09-16", json.get("fertileStart").asString());
		assertEquals(8, json.get("cycleDay").asInt());
	}

	@Test
	@Order(8)
	void 게스트_기록을_옮길_때_서버_값이_이긴다() throws Exception {
		// 9-12 수분은 이미 서버에 있고(1250), 9-11은 없다. 겹치는 날은 건너뛰어야 한다.
		String request = """
				{
				  "meals": [{
				    "id": "22222222-2222-2222-2222-222222222222", "date": "2026-09-11", "mealType": "breakfast",
				    "name": "그릭요거트", "amount": 150, "unit": "g", "calories": 130
				  }],
				  "water": [
				    { "date": "2026-09-12", "amount": 9999 },
				    { "date": "2026-09-11", "amount": 800 }
				  ],
				  "weights": [{ "date": "2026-09-11", "weight": 54.6 }]
				}
				""";

		MvcResult result = mvc.perform(post("/me/import")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
				.andReturn();

		JsonNode json = body(result);
		assertEquals(1, json.get("imported").get("meals").asInt());
		assertEquals(1, json.get("imported").get("water").asInt());
		assertEquals(1, json.get("skipped").get("water").asInt());
		// 보내지 않은 항목도 0으로 채워진다.
		assertEquals(0, json.get("imported").get("routines").asInt());

		// 서버에 있던 9-12 값은 그대로다.
		MvcResult water = mvc.perform(get("/water?date=2026-09-12")
				.header("Authorization", "Bearer " + accessToken))
				.andReturn();
		assertEquals(1250, body(water).get("amount").asInt());
	}

	@Test
	@Order(9)
	void 체중을_기록하면_목표가_다시_계산된다() throws Exception {
		// 55kg → 60kg. 명세 2-6: 가장 최근 기록이면 프로필 체중과 목표를 갱신한다.
		MvcResult result = mvc.perform(put("/weights/2026-09-13")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"weight\": 60.0 }"))
				.andReturn();

		JsonNode user = body(result).get("user");
		assertEquals(60.0, user.get("weight").asDouble());
		// BMR이 올라가 목표 칼로리도 올라간다.
		assertTrue(user.get("goals").get("targetCalorie").asInt() > 1424);
		// 물 목표도 체중 기준이라 함께 바뀐다.
		assertEquals(2000, user.get("goals").get("waterGoal").asInt());
	}

	@Test
	@Order(10)
	void 물_목표를_직접_정하고_해제하면_계산값으로_돌아온다() throws Exception {
		MvcResult custom = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
				.patch("/users/me")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"goals\": { \"waterGoal\": 2500 } }"))
				.andReturn();

		JsonNode goals = body(custom).get("goals");
		assertEquals(2500, goals.get("waterGoal").asInt());
		assertTrue(goals.get("waterGoalCustom").asBoolean());

		MvcResult cleared = mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
				.patch("/users/me")
				.header("Authorization", "Bearer " + accessToken)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"goals\": { \"waterGoalCustom\": false } }"))
				.andReturn();

		JsonNode back = body(cleared).get("goals");
		assertEquals(2000, back.get("waterGoal").asInt());
		assertTrue(!back.get("waterGoalCustom").asBoolean());
	}
}
