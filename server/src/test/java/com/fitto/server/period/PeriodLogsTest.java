package com.fitto.server.period;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 생리 기록 목록(명세 12장). 앱이 목록 전체를 보내면 서버는 통째로 바꾼다.
 * 겹침·진행 중 위치·미래 날짜는 서버가 한 번 더 막는다 — 앱 검사만 믿으면 다른 클라이언트가 우회한다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class PeriodLogsTest {

	@Autowired
	private MockMvc mvc;

	private final ObjectMapper mapper = new ObjectMapper();

	@Test
	void 목록을_통째로_바꾸고_시작일_순으로_돌려준다() throws Exception {
		String token = signup("logs-ok@fitto.app");

		// 순서를 섞어 보내도 시작일 순으로 저장된다. 가장 최근 것은 진행 중(끝날 없음).
		assertEquals(200, putLogs(token, """
				[{ "startDate": "2026-09-06", "endDate": null },
				 { "startDate": "2026-07-10", "endDate": "2026-07-15" },
				 { "startDate": "2026-08-10", "endDate": "2026-08-14" }]
				"""));
		JsonNode items = getLogs(token);
		assertEquals(3, items.size());
		assertEquals("2026-07-10", items.get(0).get("startDate").asString());
		assertEquals("2026-09-06", items.get(2).get("startDate").asString());
		assertEquals(true, items.get(2).get("endDate").isNull());

		// 같은 시작일을 다시 보내도 유일 제약에 걸리지 않는다(지우고 넣는 순서).
		assertEquals(200, putLogs(token, """
				[{ "startDate": "2026-09-06", "endDate": "2026-09-11" }]
				"""));
		assertEquals(1, getLogs(token).size());

		// 빈 목록이면 다 지운다.
		assertEquals(200, putLogs(token, "[]"));
		assertEquals(0, getLogs(token).size());
	}

	@Test
	void 겹치거나_미래이거나_진행중이_중간이면_400() throws Exception {
		String token = signup("logs-bad@fitto.app");

		assertEquals(400, putLogs(token, """
				[{ "startDate": "2026-09-01", "endDate": "2026-09-05" },
				 { "startDate": "2026-09-05", "endDate": "2026-09-08" }]
				"""), "겹침");
		assertEquals(400, putLogs(token, """
				[{ "startDate": "2026-08-01", "endDate": null },
				 { "startDate": "2026-09-01", "endDate": "2026-09-05" }]
				"""), "진행 중이 가장 최근이 아님");
		assertEquals(400, putLogs(token, """
				[{ "startDate": "2026-10-04", "endDate": null }]
				"""), "오늘보다 뒤");
		assertEquals(400, putLogs(token, """
				[{ "startDate": "2026-09-01", "endDate": "2026-08-30" }]
				"""), "끝날이 시작일보다 앞");
		assertEquals(400, putLogs(token, """
				[{ "startDate": "2026-09-01", "endDate": "2026-09-20" }]
				"""), "15일보다 김");

		// 막힌 요청은 아무것도 남기지 않는다.
		assertEquals(0, getLogs(token).size());
	}

	private int putLogs(String token, String items) throws Exception {
		return mvc.perform(put("/period/logs")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"today\": \"2026-10-03\", \"items\": " + items + " }"))
				.andReturn().getResponse().getStatus();
	}

	private JsonNode getLogs(String token) throws Exception {
		MvcResult result = mvc.perform(get("/period/logs").header("Authorization", "Bearer " + token)).andReturn();
		assertEquals(200, result.getResponse().getStatus());
		return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8)).get("items");
	}

	/**
	 * 가입은 IP마다 횟수 제한이 있다(SignupThrottle). 테스트 클래스들이 스프링 컨텍스트를 함께 써서
	 * 모두 127.0.0.1로 가입하면 다른 테스트의 가입이 429로 막힌다. 이 테스트는 따로 주소를 쓴다.
	 */
	private String signup(String email) throws Exception {
		MvcResult signup = mvc.perform(post("/auth/signup")
				.with(request -> {
					request.setRemoteAddr("10.0.0.12");
					return request;
				})
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "%s", "password": "fitto1234",
						  "profile": {
						    "name": "주기", "gender": "female", "age": 30, "height": 160.0, "weight": 52.0,
						    "activityLevel": "light", "goal": "maintain", "personality": "friendly"
						  },
						  "agreements": { "terms": true, "privacy": true, "health": true, "version": "2026-10-01" }
						}
						""".formatted(email)))
				.andReturn();
		assertEquals(201, signup.getResponse().getStatus());
		return mapper.readTree(signup.getResponse().getContentAsString(StandardCharsets.UTF_8))
				.get("accessToken").asString();
	}
}
