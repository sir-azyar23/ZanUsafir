package com.zanusafiri.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationResponse {
    private Long id;
    private String title;
    private String message;
    private String notificationType;
    private boolean isRead;
    private LocalDateTime createdAt;
}
