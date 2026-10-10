package com.fitto.server.terms;

import java.time.Clock;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Comparator;
import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * 약관 버전. 버전 이름이 곧 시행일이다(앱 terms.ts의 TERMS_HISTORY와 같은 목록).
 *
 * "지금 유효한 약관"은 서버가 날짜로 정한다. 사용자 폰에는 옛 앱이 깔려 있을 수 있어서 앱이 정하면 안 된다.
 * 날짜는 한국 시각 기준 — 시행일 0시부터 유효하다.
 */
@Component
public class TermsPolicy {

	private static final ZoneId KST = ZoneId.of("Asia/Seoul");

	private final List<LocalDate> versions;
	private final Clock clock;

	@Autowired
	public TermsPolicy(@Value("${fitto.terms.versions}") List<String> versions) {
		this(versions, Clock.system(KST));
	}

	TermsPolicy(List<String> versions, Clock clock) {
		this.versions = versions.stream().map(LocalDate::parse).sorted(Comparator.naturalOrder()).toList();
		this.clock = clock;
		if (this.versions.isEmpty()) {
			throw new IllegalStateException("fitto.terms.versions가 비어 있습니다.");
		}
	}

	/** 시행일이 지난 것 중 가장 최근. */
	public String current() {
		LocalDate today = LocalDate.now(clock);
		return versions.stream().filter(v -> !v.isAfter(today)).reduce((a, b) -> b).orElse(versions.get(0)).toString();
	}

	/** 아직 시행 전인 가장 가까운 버전. 미리 알림 기간에 앱이 보여준다. 없으면 null. */
	public String upcoming() {
		LocalDate today = LocalDate.now(clock);
		return versions.stream().filter(v -> v.isAfter(today)).findFirst().map(LocalDate::toString).orElse(null);
	}

	/** 목록에 있는 버전인지. 가입은 옛 앱도 받아 준다 — 옛 버전에 동의했으면 가입 뒤 다시 동의를 묻는다. */
	public boolean isKnown(String version) {
		return versions.stream().anyMatch(v -> v.toString().equals(version));
	}

	/** 다시 동의는 지금 버전이나 곧 시행될 버전에만. 옛 버전으로 되돌아가는 동의는 받지 않는다. */
	public boolean isAcceptableForReconsent(String version) {
		return version != null && (version.equals(current()) || version.equals(upcoming()));
	}
}
