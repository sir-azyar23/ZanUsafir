package com.zanusafiri.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class FareRequest {
    @NotNull
    private Long routeId;
    @NotNull
    private Long fromStopId;
    @NotNull
    private Long toStopId;
    @NotNull
    @DecimalMin(value = "0.0", inclusive = false, message = "Fare amount must be greater than zero")
    private BigDecimal amount;
    private String status = "ACTIVE";
    private String currency = "TZS";
}
