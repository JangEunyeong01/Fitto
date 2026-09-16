package com.fitto.server.user;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;

import org.junit.jupiter.api.Test;

import com.fitto.server.user.dto.UserPatchRequest;

import tools.jackson.databind.ObjectMapper;

/**
 * PATCH에서 "안 보낸 필드"가 "지우라는 뜻"으로 해석되지 않는지 확인한다.
 *
 * 처음에는 waterGoal을 Optional로 두고 null과 미전송을 구분하려 했는데,
 * Jackson은 필드가 없어도 Optional.empty()를 만들어서 둘이 구분되지 않았다.
 * 그래서 "해제"를 null이 아니라 waterGoalCustom: false라는 별도 필드로 받기로 했다.
 */
class UserPatchRequestTest {

	private final ObjectMapper mapper = new ObjectMapper();

	@Test
	void 안_보낸_필드는_null이다() {
		UserPatchRequest request = mapper.readValue("""
				{ "goals": { "stepGoal": 9000 } }
				""", UserPatchRequest.class);

		assertNotNull(request.goals());
		assertEquals(9000, request.goals().stepGoal());
		assertNull(request.goals().waterGoal());
		assertNull(request.goals().waterGoalCustom());
		// 프로필 필드도 건드리지 않는다.
		assertNull(request.name());
		assertNull(request.weight());
	}

	@Test
	void 물_목표_해제는_별도_필드로_받는다() {
		UserPatchRequest request = mapper.readValue("""
				{ "goals": { "waterGoalCustom": false } }
				""", UserPatchRequest.class);

		assertFalse(request.goals().waterGoalCustom());
		assertNull(request.goals().waterGoal());
	}

	@Test
	void 물_목표에_값을_보내면_그_값이_들어온다() {
		UserPatchRequest request = mapper.readValue("""
				{ "goals": { "waterGoal": 2000 } }
				""", UserPatchRequest.class);

		assertEquals(2000, request.goals().waterGoal());
	}
}
