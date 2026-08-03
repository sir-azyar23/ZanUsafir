package com.zanusafiri.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class RouteRequest {
    @NotBlank
    private String name;
    @NotBlank
    private String routeNumber;
    private String description;
    private String status = "ACTIVE";
    private String startPoint;
    private String endPoint;
    private Double startLat;
    private Double startLng;
    private Double endLat;
    private Double endLng;
    private String distance;
    private String duration;
    private String encodedPolyline;
    private String routeGeojson;
    private BigDecimal studentFare;
    private BigDecimal adultFare;
    private BigDecimal seniorFare;
    private Integer assignedBusesCount;
}
