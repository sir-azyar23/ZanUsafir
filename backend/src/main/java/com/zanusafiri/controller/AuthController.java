package com.zanusafiri.controller;

import com.zanusafiri.dto.AuthResponse;
import com.zanusafiri.dto.ChangePasswordRequest;
import com.zanusafiri.dto.LoginRequest;
import com.zanusafiri.dto.RefreshTokenRequest;
import com.zanusafiri.dto.RegisterRequest;
import com.zanusafiri.dto.UpdateProfileRequest;
import com.zanusafiri.dto.UserResponse;
import com.zanusafiri.service.AuthService;
import com.zanusafiri.service.EmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final EmailService emailService;

    /**
     * Login endpoint
     * POST /auth/login
     * Body: {"username": "...", "password": "..."}
     */
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody @Valid LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    /**
     * Register new user (Admin only)
     * POST /auth/register
     * Body: {"username": "...", "email": "...", "password": "...", "fullName": "...", "role": "TRANSPORT_OFFICER"}
     */
    @PostMapping("/register")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AuthResponse> register(@RequestBody @Valid RegisterRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    /**
     * Send a test email to verify SMTP configuration (Admin only)
     * POST /auth/test-email
     * Body: {"email": "recipient@example.com"}
     */
    @PostMapping("/test-email")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> sendTestEmail(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Email is required"));
        }

        emailService.sendTestEmail(email.trim());
        return ResponseEntity.ok(Map.of("message", "Test email sent successfully"));
    }

    /**
     * Get current authenticated user
     * GET /auth/me
     */
    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser() {
        return ResponseEntity.ok(authService.getProfile());
    }

    /**
     * Refresh JWT token
     * POST /auth/refresh
     * Body: {"refreshToken": "..."}
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refreshToken(@RequestBody @Valid RefreshTokenRequest request) {
        return ResponseEntity.ok(authService.refreshToken(request));
    }

    /**
     * Logout user
     * POST /auth/logout
     */
    @PostMapping("/logout")
    public ResponseEntity<?> logout() {
        authService.logout();
        Map<String, String> response = new HashMap<>();
        response.put("message", "Logged out successfully");
        return ResponseEntity.ok(response);
    }

    /**
     * Get current user profile
     * GET /auth/profile
     */
    @GetMapping("/profile")
    public ResponseEntity<UserResponse> getProfile() {
        return ResponseEntity.ok(authService.getProfile());
    }

    /**
     * Update current user profile
     * PUT /auth/profile
     */
    @PutMapping("/profile")
    public ResponseEntity<UserResponse> updateProfile(@RequestBody @Valid UpdateProfileRequest request) {
        return ResponseEntity.ok(authService.updateProfile(request));
    }

    /**
     * Change current user password
     * POST /auth/change-password
     */
    @PostMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody @Valid ChangePasswordRequest request) {
        authService.changePassword(request);
        Map<String, String> response = new HashMap<>();
        response.put("message", "Password changed successfully");
        return ResponseEntity.ok(response);
    }
}
