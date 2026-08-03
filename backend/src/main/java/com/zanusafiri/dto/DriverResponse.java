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
public class DriverResponse {
    private Long id;
    private String fullName;
    private String licenseNumber;
    private String phone;
    private String email;
    private String address;
    private String status;
    private Long busId;
    private String busPlateNumber;
    private LocalDateTime createdAt;
}
