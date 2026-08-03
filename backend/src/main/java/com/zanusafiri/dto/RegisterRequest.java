package com.zanusafiri.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RegisterRequest {

    @NotBlank
    private String username;

    @NotBlank
    @Email
    private String email;

    @NotBlank
    private String fullName;

    @NotBlank
    private String phoneNumber;

    private String role = "TRANSPORT_OFFICER"; // default role
}
