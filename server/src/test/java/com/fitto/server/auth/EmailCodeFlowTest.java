package com.fitto.server.auth;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.after;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import java.nio.charset.StandardCharsets;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/**
 * 비밀번호 찾기·이메일 인증(명세 4-5, 5-4).
 *
 * 메일은 실제로 보내지 않고 MailSender를 바꿔 끼워 "어떤 코드가 나갔는지"를 잡는다.
 * 코드는 DB에 해시로만 있어서, 이 방법이 아니면 테스트가 정답을 알 수 없다.
 */
@SpringBootTest
@AutoConfigureMockMvc
class EmailCodeFlowTest {

	@Autowired
	private MockMvc mvc;

	@MockitoBean
	private MailSender mailSender;

	private final ObjectMapper mapper = new ObjectMapper();

	@BeforeEach
	void resetMail() {
		clearInvocations(mailSender);
	}

	private JsonNode body(MvcResult result) throws Exception {
		return mapper.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
	}

	private JsonNode signup(String email) throws Exception {
		MvcResult result = mvc.perform(post("/auth/signup")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{
						  "email": "%s",
						  "password": "fitto1234",
						  "profile": {
						    "name": "코드", "gender": "female", "age": 30, "height": 160.0, "weight": 52.0,
						    "activityLevel": "light", "goal": "maintain", "personality": "friendly"
						  }
						}
						""".formatted(email)))
				.andReturn();
		assertEquals(201, result.getResponse().getStatus());
		return body(result);
	}

	/** 비밀번호 찾기는 응답 뒤에서 메일을 보낸다. 나갈 때까지 기다렸다가 코드를 꺼낸다. */
	private String awaitCode(String email, EmailCode.Purpose purpose) {
		ArgumentCaptor<String> code = ArgumentCaptor.forClass(String.class);
		verify(mailSender, timeout(3000)).sendCode(eq(email), eq(purpose), code.capture());
		return code.getValue();
	}

	private MvcResult forgot(String email) throws Exception {
		return mvc.perform(post("/auth/password/forgot")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\": \"%s\"}".formatted(email)))
				.andReturn();
	}

	private MvcResult reset(String email, String code, String newPassword) throws Exception {
		return mvc.perform(post("/auth/password/reset")
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"email": "%s", "code": "%s", "newPassword": "%s"}
						""".formatted(email, code, newPassword)))
				.andReturn();
	}

	@Test
	void 가입_안_된_이메일도_같은_응답이고_메일은_안_나간다() throws Exception {
		MvcResult result = forgot("nobody@fitto.app");

		// 가입된 이메일과 똑같이 202. 여기서 갈리면 가입 여부를 떠볼 수 있다.
		assertEquals(202, result.getResponse().getStatus());
		verify(mailSender, after(500).never()).sendCode(anyString(), any(), anyString());

		// 재설정도 "코드가 틀렸다"로만 답한다. 계정이 없다는 말은 하지 않는다.
		MvcResult resetResult = reset("nobody@fitto.app", "123456", "newpass123");
		assertEquals(400, resetResult.getResponse().getStatus());
		assertEquals("CODE_INVALID", body(resetResult).get("code").asString());
	}

	@Test
	void 코드로_비밀번호를_바꾸면_바로_로그인되고_다른_기기는_끊긴다() throws Exception {
		String email = "reset@fitto.app";
		JsonNode joined = signup(email);
		String oldRefresh = joined.get("refreshToken").asString();
		assertFalse(joined.get("user").get("emailVerified").asBoolean());

		assertEquals(202, forgot(email).getResponse().getStatus());
		String code = awaitCode(email, EmailCode.Purpose.RESET_PASSWORD);
		assertEquals(6, code.length());

		// 틀린 코드
		String wrong = code.equals("000000") ? "111111" : "000000";
		MvcResult bad = reset(email, wrong, "newpass123");
		assertEquals(400, bad.getResponse().getStatus());
		assertEquals("CODE_INVALID", body(bad).get("code").asString());

		// 맞는 코드 → 로그인된 상태로 돌아온다. 메일함을 열었으니 인증도 된 것으로 본다.
		MvcResult ok = reset(email, code, "newpass123");
		assertEquals(200, ok.getResponse().getStatus());
		JsonNode okBody = body(ok);
		assertTrue(okBody.get("user").get("emailVerified").asBoolean());
		assertNotEquals(oldRefresh, okBody.get("refreshToken").asString());

		// 같은 코드는 두 번 못 쓴다
		assertEquals(400, reset(email, code, "another123").getResponse().getStatus());

		// 새 비밀번호로 로그인된다
		MvcResult login = mvc.perform(post("/auth/login")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"email\": \"%s\", \"password\": \"newpass123\"}".formatted(email)))
				.andReturn();
		assertEquals(200, login.getResponse().getStatus());

		// 재설정 전에 로그인해 있던 기기는 갱신이 막힌다
		MvcResult refresh = mvc.perform(post("/auth/refresh")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"refreshToken\": \"%s\"}".formatted(oldRefresh)))
				.andReturn();
		assertEquals(401, refresh.getResponse().getStatus());
	}

	@Test
	void 이메일_인증() throws Exception {
		String email = "verify@fitto.app";
		String token = signup(email).get("accessToken").asString();

		MvcResult send = mvc.perform(post("/users/me/email/verification")
				.header("Authorization", "Bearer " + token))
				.andReturn();
		assertEquals(204, send.getResponse().getStatus());
		String code = awaitCode(email, EmailCode.Purpose.VERIFY_EMAIL);

		// 1분 안에 다시 받으려 하면 막는다
		MvcResult again = mvc.perform(post("/users/me/email/verification")
				.header("Authorization", "Bearer " + token))
				.andReturn();
		assertEquals(429, again.getResponse().getStatus());

		MvcResult confirm = mvc.perform(post("/users/me/email/verification/confirm")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"code\": \"%s\"}".formatted(code)))
				.andReturn();
		assertEquals(200, confirm.getResponse().getStatus());
		assertTrue(body(confirm).get("emailVerified").asBoolean());

		MvcResult me = mvc.perform(get("/users/me").header("Authorization", "Bearer " + token)).andReturn();
		assertTrue(body(me).get("emailVerified").asBoolean());
	}

	@Test
	void 다섯_번_틀리면_맞는_코드도_받지_않는다() throws Exception {
		String email = "lock@fitto.app";
		String token = signup(email).get("accessToken").asString();

		mvc.perform(post("/users/me/email/verification").header("Authorization", "Bearer " + token));
		String code = awaitCode(email, EmailCode.Purpose.VERIFY_EMAIL);
		String wrong = code.equals("000000") ? "111111" : "000000";

		for (int i = 0; i < EmailCodeService.MAX_ATTEMPTS; i++) {
			MvcResult bad = mvc.perform(post("/users/me/email/verification/confirm")
					.header("Authorization", "Bearer " + token)
					.contentType(MediaType.APPLICATION_JSON)
					.content("{\"code\": \"%s\"}".formatted(wrong)))
					.andReturn();
			assertEquals(400, bad.getResponse().getStatus());
		}

		// 틀린 횟수가 저장돼 있어야 이게 막힌다. 거절하면서 롤백됐다면 여기서 통과해 버린다.
		MvcResult right = mvc.perform(post("/users/me/email/verification/confirm")
				.header("Authorization", "Bearer " + token)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"code\": \"%s\"}".formatted(code)))
				.andReturn();
		assertEquals(400, right.getResponse().getStatus());
	}
}
