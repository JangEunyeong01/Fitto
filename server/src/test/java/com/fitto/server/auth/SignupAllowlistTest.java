package com.fitto.server.auth;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

/** 비공개로 운영하는 동안 가입 문을 닫는 장치라, 열려야 할 때와 닫혀야 할 때를 확인한다. */
class SignupAllowlistTest {

	@Test
	void 비워두면_누구나_가입할_수_있다() {
		assertTrue(new SignupAllowlist("").isAllowed("anyone@fitto.app"));
		assertTrue(new SignupAllowlist("  ").isAllowed("anyone@fitto.app"));
		assertTrue(new SignupAllowlist(null).isAllowed("anyone@fitto.app"));
	}

	@Test
	void 목록에_있는_이메일만_받는다() {
		SignupAllowlist list = new SignupAllowlist("me@fitto.app");

		assertTrue(list.isAllowed("me@fitto.app"));
		assertFalse(list.isAllowed("stranger@fitto.app"));
	}

	@Test
	void 대소문자와_공백은_구분하지_않는다() {
		// 가입할 때 이메일을 소문자로 저장한다. 비교 기준이 다르면 본인도 못 들어온다.
		SignupAllowlist list = new SignupAllowlist(" Me@Fitto.app , you@fitto.app ");

		assertTrue(list.isAllowed("me@fitto.app"));
		assertTrue(list.isAllowed("ME@FITTO.APP"));
		assertTrue(list.isAllowed("you@fitto.app"));
	}

	@Test
	void 쉼표만_잘못_찍혀도_전부_열리지_않는다() {
		// "a@fitto.app,"처럼 끝에 쉼표가 남으면 빈 항목이 생긴다. 그게 "목록이 비었다"로 읽히면 문이 열린다.
		SignupAllowlist list = new SignupAllowlist("me@fitto.app,");

		assertFalse(list.isAllowed("stranger@fitto.app"));
		assertFalse(list.isAllowed(""));
	}
}
