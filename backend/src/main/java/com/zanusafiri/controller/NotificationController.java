package com.zanusafiri.controller;

import com.zanusafiri.dto.NotificationResponse;
import com.zanusafiri.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class NotificationController {

    private final NotificationService notificationService;

    /** GET /notifications?page=0&size=20 */
    @GetMapping
    public ResponseEntity<Page<NotificationResponse>> getNotifications(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(notificationService.getMyNotifications(pageable));
    }

    /** GET /notifications/unread-count */
    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Long>> getUnreadCount() {
        return ResponseEntity.ok(Map.of("count", notificationService.getUnreadCount()));
    }

    /** PATCH /notifications/{id}/read */
    @PatchMapping("/{id}/read")
    public ResponseEntity<NotificationResponse> markRead(@PathVariable Long id) {
        return ResponseEntity.ok(notificationService.markRead(id));
    }

    /** PATCH /notifications/mark-all-read */
    @PatchMapping("/mark-all-read")
    public ResponseEntity<Map<String, String>> markAllRead() {
        notificationService.markAllRead();
        return ResponseEntity.ok(Map.of("message", "All notifications marked as read"));
    }

    /** DELETE /notifications/{id} */
    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, String>> deleteOne(@PathVariable Long id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(Map.of("message", "Notification deleted"));
    }

    /** DELETE /notifications/clear-all */
    @DeleteMapping("/clear-all")
    public ResponseEntity<Map<String, String>> clearAll() {
        notificationService.deleteAll();
        return ResponseEntity.ok(Map.of("message", "All notifications cleared"));
    }
}
