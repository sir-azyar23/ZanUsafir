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
public class TicketResponse {
    private Long id;
    private String ticketNumber;
    private Long userId;
    private String passengerName;
    private Long routeId;
    private String routeName;
    private Long fromStopId;
    private String fromStopName;
    private Long toStopId;
    private String toStopName;
    private BigDecimal amount;
    private String currency;
    private String status;
    private LocalDateTime travelDate;
    private LocalDateTime createdAt;
}
