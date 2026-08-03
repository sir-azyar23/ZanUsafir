package com.zanusafiri.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateProfileRequest {

    @NotBlank
    private String fullName;

    @NotBlank
    @Email
    private String email;

    private String phoneNumber;
}
