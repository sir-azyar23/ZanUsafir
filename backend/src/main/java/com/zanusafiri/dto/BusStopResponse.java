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
public class BusStopResponse {
    private Long id;
    private String name;
    private String stopCode;
    private String address;
    private Double latitude;
    private Double longitude;
    private String status;
    private LocalDateTime createdAt;
}
