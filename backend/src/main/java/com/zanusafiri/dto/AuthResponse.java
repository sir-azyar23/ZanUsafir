package com.zanusafiri.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AuthResponse {
    private String token;
    private String refreshToken;
    @Builder.Default
    private String tokenType = "Bearer";
    private Long userId;
    private String username;
    private String email;
    private String fullName;
    private String phoneNumber;
    private String role;
    private boolean mustChangePassword;
    private LocalDateTime temporaryPasswordExpiresAt;
    private boolean emailSent;
    private String message;
    private String generatedPassword;
}
