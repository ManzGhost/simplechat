package com.simplechat.controller;

import com.simplechat.dto.UpdateProfileRequest;
import com.simplechat.dto.UserDTO;
import com.simplechat.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping("/me")
    public ResponseEntity<UserDTO> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        String userId = userDetails.getUsername(); // userId stored as principal username
        return ResponseEntity.ok(userService.getUserById(userId));
    }

    @PutMapping("/me")
    public ResponseEntity<UserDTO> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UpdateProfileRequest request) {
        String userId = userDetails.getUsername();
        return ResponseEntity.ok(userService.updateProfile(userId, request));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDTO>> searchUsers(
            @RequestParam(name = "query", defaultValue = "") String query,
            @AuthenticationPrincipal UserDetails userDetails) {
        String currentUserId = userDetails.getUsername();
        return ResponseEntity.ok(userService.searchUsers(query, currentUserId));
    }
}
