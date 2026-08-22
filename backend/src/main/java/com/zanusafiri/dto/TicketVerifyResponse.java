package com.zanusafiri.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class TicketVerifyResponse {
    /** VALID | ALREADY_USED | INVALID | CANCELLED | UNPAID */
    private String result;
    private String message;
    private String ticketNumber;
    private String referenceNumber;
    private String passengerName;
    private String passengerType;
    private String routeName;
    private String status;
    private String paymentStatus;
    private String scannedAt;
}
