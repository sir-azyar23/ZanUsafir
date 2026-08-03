package com.zanusafiri.service;

import com.zanusafiri.dto.NotificationResponse;
import com.zanusafiri.entity.Notification;
import com.zanusafiri.repository.NotificationRepository;
import com.zanusafiri.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

    /**
     * Push a notification to all ADMIN users.
     * Call this after any significant CRUD event.
     */
    public void notifyAdmins(String title, String message, String type) {
        userRepository.findAll().stream()
            .filter(u -> u.getRole() != null && "ADMIN".equals(u.getRole().name()))
            .forEach(admin -> {
                Notification n = Notification.builder()
                    .title(title)
                    .message(message)
                    .notificationType(type)
                    .userId(admin.getId())
                    .isRead(false)
                    .build();
                notificationRepository.save(n);
            });
    }

    /** Get all notifications for the currently authenticated user. */
    @Transactional(readOnly = true)
    public Page<NotificationResponse> getMyNotifications(Pageable pageable) {
        Long userId = getCurrentUserId();
        List<Notification> all = notificationRepository.findByUserIdOrderByCreatedAtDesc(userId);
        int start = (int) pageable.getOffset();
        int end = Math.min(start + pageable.getPageSize(), all.size());
        List<NotificationResponse> page = all.subList(start, end).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
        return new PageImpl<>(page, pageable, all.size());
    }

    /** Count unread for current user. */
    @Transactional(readOnly = true)
    public long getUnreadCount() {
        return notificationRepository.countByUserIdAndIsReadFalse(getCurrentUserId());
    }

    /** Mark a single notification as read. */
    @Transactional
    public NotificationResponse markRead(Long id) {
        Long userId = getCurrentUserId();
        Notification n = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Notification not found: " + id));
        if (!n.getUserId().equals(userId)) throw new RuntimeException("Forbidden");
        n.setRead(true);
        return toResponse(notificationRepository.save(n));
    }

    /** Mark all notifications as read for current user. */
    @Transactional
    public void markAllRead() {
        Long userId = getCurrentUserId();
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalse(userId);
        unread.forEach(n -> n.setRead(true));
        notificationRepository.saveAll(unread);
    }

    /** Delete a single notification. */
    @Transactional
    public void deleteNotification(Long id) {
        Long userId = getCurrentUserId();
        Notification n = notificationRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Notification not found: " + id));
        if (!n.getUserId().equals(userId)) throw new RuntimeException("Forbidden");
        notificationRepository.delete(n);
    }

    /** Delete all notifications for current user. */
    @Transactional
    public void deleteAll() {
        notificationRepository.deleteByUserId(getCurrentUserId());
    }

    private Long getCurrentUserId() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new RuntimeException("User not found"))
            .getId();
    }

    private NotificationResponse toResponse(Notification n) {
        return NotificationResponse.builder()
            .id(n.getId())
            .title(n.getTitle())
            .message(n.getMessage())
            .notificationType(n.getNotificationType())
            .isRead(n.isRead())
            .createdAt(n.getCreatedAt())
            .build();
    }
}
