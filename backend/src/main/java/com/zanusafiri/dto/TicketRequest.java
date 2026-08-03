package com.zanusafiri.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class TicketRequest {

    @NotNull
    private Long routeId;

    @NotNull
    private Long fromStopId;

    @NotNull
    private Long toStopId;

    private LocalDateTime travelDate;
    private String passengerName;
    private String passengerPhone;
}
