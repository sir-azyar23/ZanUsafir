package com.zanusafiri.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DriverRequest {
    @NotBlank
    private String fullName;
    @NotBlank
    private String licenseNumber;
    @NotBlank
    private String phone;
    private String email;
    private String address;
    private String status = "ACTIVE";
    private Long busId;
}
