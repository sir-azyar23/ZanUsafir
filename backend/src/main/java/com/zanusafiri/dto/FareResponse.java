package com.zanusafiri.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class FareResponse {
    private Long id;
    private Long routeId;
    private String routeName;
    private Long fromStopId;
    private String fromStopName;
    private Long toStopId;
    private String toStopName;
    private BigDecimal amount;
    private String status;
    private String currency;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
