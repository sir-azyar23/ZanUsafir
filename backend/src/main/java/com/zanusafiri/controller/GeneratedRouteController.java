package com.zanusafiri.controller;

import com.zanusafiri.dto.GeneratedRouteRequest;
import com.zanusafiri.dto.GeneratedRouteResponse;
import com.zanusafiri.dto.RouteReviewRequest;
import com.zanusafiri.service.GeneratedRouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/generated-routes")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class GeneratedRouteController {

    private final GeneratedRouteService generatedRouteService;

    @GetMapping
    public ResponseEntity<List<GeneratedRouteResponse>> getGeneratedRoutes(
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) String status) {
        return ResponseEntity.ok(generatedRouteService.getGeneratedRoutes(routeId, status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<GeneratedRouteResponse> getGeneratedRoute(@PathVariable Long id) {
        return ResponseEntity.ok(generatedRouteService.getGeneratedRoute(id));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'TRANSPORT_OFFICER')")
    public ResponseEntity<GeneratedRouteResponse> createGeneratedRoute(@RequestBody @Valid GeneratedRouteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(generatedRouteService.createGeneratedRoute(request));
    }

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('TRANSPORT_OFFICER')")
    public ResponseEntity<GeneratedRouteResponse> approveRoute(@PathVariable Long id,
                                                                @RequestBody(required = false) RouteReviewRequest request) {
        return ResponseEntity.ok(generatedRouteService.approveRoute(id, request != null ? request.getComment() : null));
    }

    @PatchMapping("/{id}/activate")
    @PreAuthorize("hasRole('TRANSPORT_OFFICER')")
    public ResponseEntity<GeneratedRouteResponse> activateRoute(@PathVariable Long id,
                                                                 @RequestBody(required = false) RouteReviewRequest request) {
        return ResponseEntity.ok(generatedRouteService.activateRoute(id, request != null ? request.getComment() : null));
    }

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('TRANSPORT_OFFICER')")
    public ResponseEntity<GeneratedRouteResponse> rejectRoute(@PathVariable Long id,
                                                               @RequestBody RouteReviewRequest request) {
        return ResponseEntity.ok(generatedRouteService.rejectRoute(id, request != null ? request.getComment() : null));
    }
}
