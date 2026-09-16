package com.fitto.server.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

import com.fitto.server.user.dto.UserPatchRequest;

import tools.jackson.databind.ObjectMapper;

/**
 * PATCH의 세 가지 상태가 구분되는지 확인한다.
 *
 * - 필드를 안 보냄  → 유지
 * - null을 보냄     → 물 목표 직접 설정 해제 (명세 5장)
 * - 값을 보냄       → 그 값으로 설정
 *
 * Jackson이 이 셋을 구분하지 못하면 "안 보낸 필드"가 "지우라는 뜻"이 돼서 프로필이 날아간다.
 */
class UserPatchRequestTest {

	private final ObjectMapper mapper = new ObjectMapper();

	@Test
	void 물_목표를_안_보내면_Optional이_null이다() {
		UserPatchRequest request = mapper.readValue("""
				{ "goals": { "stepGoal": 9000 } }
				""", UserPatchRequest.class);

		assertNotNull(request.goals());
		assertNull(request.goals().waterGoal());
		assertEquals(9000, request.goals().stepGoal());
	}

	@Test
	void 물_목표에_null을_보내면_빈_Optional이다() {
		UserPatchRequest request = mapper.readValue("""
				{ "goals": { "waterGoal": null } }
				""", UserPatchRequest.class);

		assertNotNull(request.goals().waterGoal());
		assertTrue(request.goals().waterGoal().isEmpty());
	}

	@Test
	void 물_목표에_값을_보내면_그_값이_들어온다() {
		UserPatchRequest request = mapper.readValue("""
				{ "goals": { "waterGoal": 2000 } }
				""", UserPatchRequest.class);

		assertEquals(2000, request.goals().waterGoal().orElseThrow());
	}

}
