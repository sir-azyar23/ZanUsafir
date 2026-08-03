package com.zanusafiri.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class BusStopRequest {
    @NotBlank
    private String name;
    private String stopCode;
    private String address;
    @NotNull
    private Double latitude;
    @NotNull
    private Double longitude;
    private String status = "ACTIVE";
}
