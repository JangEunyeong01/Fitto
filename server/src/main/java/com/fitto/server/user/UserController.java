package com.fitto.server.user;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.fitto.server.auth.AuthenticatedUser;
import com.fitto.server.user.dto.ImportRequest;
import com.fitto.server.user.dto.ImportResult;
import com.fitto.server.user.dto.UserPatchRequest;

import jakarta.validation.Valid;

/** 명세 5장·6장. */
@RestController
public class UserController {

	private final UserService userService;
	private final ImportService importService;

	public UserController(UserService userService, ImportService importService) {
		this.userService = userService;
		this.importService = importService;
	}

	@GetMapping("/users/me")
	public UserResponse me() {
		return userService.get(AuthenticatedUser.requireId());
	}

	@PatchMapping("/users/me")
	public UserResponse patchMe(@Valid @RequestBody UserPatchRequest request) {
		return userService.patch(AuthenticatedUser.requireId(), request);
	}

	@PostMapping("/me/import")
	public ImportResult importGuestData(@Valid @RequestBody ImportRequest request) {
		return importService.importAll(AuthenticatedUser.requireId(), request);
	}
}
