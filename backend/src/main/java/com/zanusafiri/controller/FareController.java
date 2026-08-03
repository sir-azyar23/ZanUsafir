package com.zanusafiri.controller;

import com.zanusafiri.dto.FareRequest;
import com.zanusafiri.dto.FareResponse;
import com.zanusafiri.service.FareService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/fares")
@RequiredArgsConstructor
public class FareController {

    private final FareService fareService;

    @GetMapping
    public ResponseEntity<List<FareResponse>> getAllFares(@RequestParam(required = false) Long routeId) {
        if (routeId != null) return ResponseEntity.ok(fareService.getFaresByRoute(routeId));
        return ResponseEntity.ok(fareService.getAllFares());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FareResponse> getFare(@PathVariable Long id) {
        return ResponseEntity.ok(fareService.getFareById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FareResponse> createFare(@RequestBody @Valid FareRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(fareService.createFare(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<FareResponse> updateFare(@PathVariable Long id,
                                                    @RequestBody @Valid FareRequest request) {
        return ResponseEntity.ok(fareService.updateFare(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteFare(@PathVariable Long id) {
        fareService.deleteFare(id);
        return ResponseEntity.noContent().build();
    }
}
