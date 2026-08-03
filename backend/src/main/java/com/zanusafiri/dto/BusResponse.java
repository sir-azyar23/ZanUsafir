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
public class BusResponse {
    private Long id;
    private String busNumber;
    private String plateNumber;
    private Integer capacity;
    private String model;
    private String color;
    private String status;
    private Long routeId;
    private String routeName;
    private String driverName;
    private Long driverId;
    private LocalDateTime createdAt;
}
