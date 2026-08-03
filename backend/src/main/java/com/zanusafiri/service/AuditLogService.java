package com.zanusafiri.service;

import com.zanusafiri.entity.AuditLog;
import com.zanusafiri.repository.AuditLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AuditLogService {

    private final AuditLogRepository auditLogRepository;

    public void log(String action, String entityName, Long entityId, String description) {
        String performedBy = "system";
        try {
            performedBy = SecurityContextHolder.getContext().getAuthentication().getName();
        } catch (Exception ignored) {}

        AuditLog log = AuditLog.builder()
            .action(action)
            .entityName(entityName)
            .entityId(entityId)
            .description(description)
            .performedBy(performedBy)
            .build();
        auditLogRepository.save(log);
    }

    public Page<AuditLog> getAll(Pageable pageable) {
        return auditLogRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    public Page<AuditLog> getByUser(String username, Pageable pageable) {
        return auditLogRepository.findByPerformedByOrderByCreatedAtDesc(username, pageable);
    }

    public Page<AuditLog> getByEntity(String entityName, Pageable pageable) {
        return auditLogRepository.findByEntityNameOrderByCreatedAtDesc(entityName, pageable);
    }
}
