package com.zanusafiri.controller;

import com.zanusafiri.entity.AuditLog;
import com.zanusafiri.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/audit-logs")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AuditLogController {

    private final AuditLogService auditLogService;

    @GetMapping
    public ResponseEntity<Page<AuditLog>> getLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String user,
            @RequestParam(required = false) String entity) {
        Pageable pageable = PageRequest.of(page, size);
        if (user != null) return ResponseEntity.ok(auditLogService.getByUser(user, pageable));
        if (entity != null) return ResponseEntity.ok(auditLogService.getByEntity(entity, pageable));
        return ResponseEntity.ok(auditLogService.getAll(pageable));
    }
}
