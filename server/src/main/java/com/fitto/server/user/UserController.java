package com.fitto.server.user;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.AuthService;
import com.fitto.server.auth.AuthenticatedUser;
import com.fitto.server.auth.dto.TokenResponse;
import com.fitto.server.user.dto.AccountDeleteRequest;
import com.fitto.server.user.dto.ImportRequest;
import com.fitto.server.user.dto.ImportResult;
import com.fitto.server.user.dto.PasswordChangeRequest;
import com.fitto.server.user.dto.UserPatchRequest;

import jakarta.validation.Valid;

/** 명세 5장·6장. */
@RestController
public class UserController {

	private final UserService userService;
	private final ImportService importService;
	private final AuthService authService;
	private final AccountService accountService;

	public UserController(UserService userService, ImportService importService, AuthService authService,
			AccountService accountService) {
		this.userService = userService;
		this.importService = importService;
		this.authService = authService;
		this.accountService = accountService;
	}

	@GetMapping("/users/me")
	public UserResponse me() {
		return userService.get(AuthenticatedUser.requireId());
	}

	@PatchMapping("/users/me")
	public UserResponse patchMe(@Valid @RequestBody UserPatchRequest request) {
		return userService.patch(AuthenticatedUser.requireId(), request);
	}

	/** 바꾼 기기가 계속 쓸 수 있게 새 토큰 한 쌍을 돌려준다. 다른 기기는 로그아웃된다. */
	@PatchMapping("/users/me/password")
	public TokenResponse changePassword(@Valid @RequestBody PasswordChangeRequest request) {
		return authService.changePassword(AuthenticatedUser.requireId(), request.currentPassword(),
				request.newPassword());
	}

	@DeleteMapping("/users/me")
	public ResponseEntity<Void> deleteMe(@Valid @RequestBody AccountDeleteRequest request) {
		accountService.delete(AuthenticatedUser.requireId(), request.password());
		return ResponseEntity.noContent().build();
	}

	@PostMapping("/me/import")
	public ImportResult importGuestData(@Valid @RequestBody ImportRequest request) {
		return importService.importAll(AuthenticatedUser.requireId(), request);
	}
}
