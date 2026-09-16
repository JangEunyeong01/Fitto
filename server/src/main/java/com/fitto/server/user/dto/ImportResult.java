package com.fitto.server.user.dto;

import java.util.LinkedHashMap;
import java.util.Map;

import com.fitto.server.user.UserResponse;

/**
 * 이전 결과(명세 6장).
 * 무엇이 들어갔고 무엇이 건너뛰어졌는지 나눠서 돌려준다 — 앱이 "12건 옮겼어요"를 보여줄 수 있고,
 * 건너뛴 게 많으면 이미 한 번 올라갔다는 뜻이라 사용자에게 다르게 안내할 수 있다.
 */
public record ImportResult(Map<String, Integer> imported, Map<String, Integer> skipped, UserResponse user) {

	public static class Counter {
		private final Map<String, Integer> imported = new LinkedHashMap<>();
		private final Map<String, Integer> skipped = new LinkedHashMap<>();

		public void imported(String key) {
			imported.merge(key, 1, Integer::sum);
		}

		public void skipped(String key) {
			skipped.merge(key, 1, Integer::sum);
		}

		/** 한 건도 없던 항목도 0으로 채운다. 앱이 키 존재 여부를 확인하지 않아도 되게 한다. */
		public ImportResult toResult(UserResponse user, String... keys) {
			for (String key : keys) {
				imported.putIfAbsent(key, 0);
				skipped.putIfAbsent(key, 0);
			}
			return new ImportResult(imported, skipped, user);
		}
	}
}
