package com.zanusafiri.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class GeneratedRouteRequest {
    @NotNull
    private Long routeId;

    @NotBlank
    private String name;

    @NotBlank
    private String selectedStops;

    private String mapData;

    private String status;
}
