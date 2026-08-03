package com.zanusafiri.controller;

import com.zanusafiri.dto.UserResponse;
import com.zanusafiri.dto.RegisterRequest;
import com.zanusafiri.entity.User;
import com.zanusafiri.exception.UserNotFoundException;
import com.zanusafiri.repository.NotificationRepository;
import com.zanusafiri.repository.UserRepository;
import com.zanusafiri.service.AuditLogService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
@SuppressWarnings("null")
public class UserController {

    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogService auditLogService;
    private final com.zanusafiri.service.NotificationService notificationService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        List<UserResponse> users = userRepository.findAll().stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
        return ResponseEntity.ok(users);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (user.getUsername().equals(currentUsername)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot delete your own account");
        }

        String deletedUsername = user.getUsername();
        try {
            notificationRepository.deleteByUserId(id);
            userRepository.delete(user);
            userRepository.flush();
            auditLogService.log("DELETE", "User", id, "Deleted user: " + deletedUsername);
            return ResponseEntity.ok(Map.of("message", "User deleted permanently"));
        } catch (DataIntegrityViolationException e) {
            throw new ResponseStatusException(
                HttpStatus.CONFLICT,
                "User cannot be deleted because other records still depend on this account."
            );
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id, @RequestBody @Valid RegisterRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));

        userRepository.findByEmail(request.getEmail())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new RuntimeException("Email already in use");
            });

        userRepository.findByUsername(request.getUsername())
            .filter(existing -> !existing.getId().equals(id))
            .ifPresent(existing -> {
                throw new RuntimeException("Username already taken");
            });

        user.setUsername(request.getUsername());
        user.setEmail(request.getEmail());
        user.setFullName(request.getFullName());
        user.setPhoneNumber(request.getPhoneNumber());
        user.setRole(User.Role.fromInput(request.getRole()));
        User saved = userRepository.save(user);
        auditLogService.log("UPDATE", "User", id, "Updated user: " + saved.getUsername());
        notificationService.notifyAdmins(
            "User Account Updated",
            "User account @" + saved.getUsername() + " (" + saved.getRole().name() + ") has been updated.",
            "USER"
        );
        return ResponseEntity.ok(toResponse(saved));
    }

    @PatchMapping("/{id}/toggle-active")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserResponse> toggleActive(@PathVariable Long id) {
        String currentUsername = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getUsername().equals(currentUsername)) {
            throw new RuntimeException("Cannot deactivate your own account");
        }
        user.setActive(!user.isActive());
        userRepository.save(user);
        auditLogService.log("UPDATE", "User", id,
            (user.isActive() ? "Activated" : "Deactivated") + " user: " + user.getUsername());
        notificationService.notifyAdmins(
            user.isActive() ? "User Account Activated" : "User Account Deactivated",
            "User @" + user.getUsername() + " has been " + (user.isActive() ? "activated" : "deactivated") + ".",
            "USER"
        );
        return ResponseEntity.ok(toResponse(user));
    }

    private UserResponse toResponse(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .fullName(user.getFullName())
            .phoneNumber(user.getPhoneNumber())
            .role(user.getRole().name())
            .active(user.isActive())
            .mustChangePassword(user.isMustChangePassword())
            .temporaryPasswordExpiresAt(user.getTemporaryPasswordExpiresAt())
            .createdAt(user.getCreatedAt())
            .build();
    }
}
