package com.zanusafiri.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class RouteSettingsRequest {
    private BigDecimal studentFare;
    private BigDecimal adultFare;
    private BigDecimal seniorFare;
    private Integer assignedBusesCount;
}
