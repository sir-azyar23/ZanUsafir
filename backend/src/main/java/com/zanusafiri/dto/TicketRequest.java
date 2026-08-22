package com.zanusafiri.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
public class TicketRequest {

    @NotNull
    private Long routeId;

    /** STUDENT | ADULT | SENIOR */
    @NotBlank
    private String passengerType;

    @NotBlank
    private String passengerName;

    private String passengerPhone;

    /** MOBILE_MONEY | BANK_CARD */
    @NotBlank
    private String paymentMethod;

    /** M-Pesa | Airtel Money | Tigo Pesa | HaloPesa | Visa | Mastercard */
    @NotBlank
    private String paymentProvider;

    /** Transaction reference from payment provider */
    @NotBlank
    private String transactionReference;

    // Legacy fields — kept for old code paths
    private Long fromStopId;
    private Long toStopId;
    private LocalDateTime travelDate;
}
