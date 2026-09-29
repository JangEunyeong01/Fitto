package com.fitto.server.user.dto;

import com.fitto.server.user.DeletionReason;

import jakarta.validation.constraints.NotBlank;

/**
 * 탈퇴 요청(명세 5장).
 * 되돌릴 수 없는 동작이라 토큰만으로는 받지 않는다 — 잠금 안 된 폰을 잠깐 만진 사람이 계정을 지울 수 있으면 안 된다.
 *
 * @param reason 떠나는 이유. 선택이라 없어도 된다. 누가 골랐는지는 남기지 않는다
 */
public record AccountDeleteRequest(@NotBlank String password, DeletionReason reason) {
}
