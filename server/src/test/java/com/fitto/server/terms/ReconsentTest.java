package com.fitto.server.terms;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.UUID;

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
 * 약관 다시 동의(명세 5-5). 테스트 설정의 버전은 2026-10-01, 2026-10-07 — 둘 다 지난 날짜라 지금 버전은 10-07.
 * 옛 버전(10-01)으로 가입한 계정이 다시 동의하는 흐름을 본다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class ReconsentTest {

	@Autowired
	private MockMvc mvc;

	@Autowired
	private UserAgreementRepository agreementRepository;

	private final ObjectMapper mapper = new ObjectMapper();

	@Test
	void 지금_버전은_로그인_없이_본다() throws Exception {
		MvcResult result = mvc.perform(get("/terms")).andReturn();
		assertEquals(200, result.getResponse().getStatus());
		JsonNode json = read(result);
		assertEquals("2026-10-07", json.get("current").asString());
		assertEquals(true, json.get("upcoming").isNull());
	}

	@Test
	void 옛_버전_가입자가_다시_동의하면_버전이_바뀌고_이력이_쌓인다() throws Exception {
		JsonNode auth = signup("reconsent-ok@fitto.app", "2026-10-01");
		String token = auth.get("accessToken").asString();
		UUID userId = UUID.fromString(auth.get("user").get("userId").asString());
		assertEquals("2026-10-01", auth.get("user").get("agreedTermsVersion").asString());

		MvcResult result = agree(token, true, "2026-10-07");
		assertEquals(200, result.getResponse().getStatus());
		assertEquals("2026-10-07", read(result).get("agreedTermsVersion").asString());

		// 가입 때 한 줄 + 다시 동의 한 줄. 마지막 것만 남기지 않는다.
		List<UserAgreement> history = agreementRepository.findAllByUserIdOrderByAgreedAtAsc(userId);
		assertEquals(2, history.size());
		assertEquals("2026-10-01", history.get(0).getVersion());
		assertEquals("2026-10-07", history.get(1).getVersion());
	}

	@Test
	void 옛_버전이나_모르는_버전으로는_다시_동의할_수_없다() throws Exception {
		String token = signup("reconsent-old@fitto.app", "2026-10-07").get("accessToken").asString();

		assertEquals(409, agree(token, true, "2026-10-01").getResponse().getStatus(), "되돌아가는 동의");
		assertEquals(409, agree(token, true, "2099-01-01").getResponse().getStatus(), "모르는 버전");
		assertEquals(400, agree(token, false, "2026-10-07").getResponse().getStatus(), "하나라도 false");
	}

	@Test
	void 모르는_버전으로는_가입할_수_없다() throws Exception {
		assertEquals(409, signupStatus("reconsent-unknown@fitto.app", "2026-10-02"));
	}

	@Test
	void 로그인_없이는_다시_동의할_수_없다() throws Exception {
		assertEquals(401, mvc.perform(post("/users/me/agreements")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"terms\": true, \"privacy\": true, \"health\": true, \"version\": \"2026-10-07\" }"))
				.andReturn().getResponse().getStatus());
	}

	private MvcResult agree(String token, boolean health, String version) throws Exception {
		return mvc.perform(post("/users/me/agreements")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{ \"terms\": true, \"privacy\": true, \"health\": %s, \"version\": \"%s\" }"
						.formatted(health, version)))
				.andReturn();
	}

	private JsonNode signup(String email, String version) throws Exception {
		MvcResult result = signupRequest(email, version);
		assertEquals(201, result.getResponse().getStatus());
		return read(result);
	}

	private int signupStatus(String email, String version) throws Exception {
		return signupRequest(email, version).getResponse().getStatus();
	}

	/** 가입은 IP마다 횟수 제한이 있어 다른 테스트와 겹치지 않는 주소를 쓴다(PeriodLogsTest와 같은 이유). */
	private MvcResult signupRequest(String email, String version) throws Exception {
		return mvc.perform(post("/auth/signup")
				.with(request -> {
					request.setRemoteAddr("10.0.0.13");
					return request;
				})
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "%s", "password": "fitto1234",
						  "profile": {
						    "name": "동의", "gender": "female", "age": 30, "height": 160.0, "weight": 52.0,
						    "activityLevel": "light", "goal": "maintain", "personality": "friendly"
						  },
						  "agreements": { "terms": true, "privacy": true, "health": true, "version": "%s" }
						}
						""".formatted(email, version)))
				.andReturn();
	}

	private JsonNode read(MvcResult result) throws Exception {
		return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
	}
}
