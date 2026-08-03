package com.zanusafiri.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RouteResponse {
    private Long id;
    private String name;
    private String routeNumber;
    private String description;
    private String status;
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
    private List<RouteStopResponse> stops;
    private int busCount;
    private BigDecimal studentFare;
    private BigDecimal adultFare;
    private BigDecimal seniorFare;
    private Integer assignedBusesCount;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class RouteStopResponse {
        private Long id;
        private Long stopId;
        private String stopName;
        private String stopCode;
        private String address;
        private Double latitude;
        private Double longitude;
        private Integer stopOrder;
        private Double mapX;
        private Double mapY;
    }
}
