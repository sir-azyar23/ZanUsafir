package com.zanusafiri.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BusRequest {
    @NotBlank
    private String busNumber;
    @NotBlank
    private String plateNumber;
    @NotNull
    private Integer capacity;
    private String model;
    private String color;
    private String status = "ACTIVE";
    private Long routeId;
}
