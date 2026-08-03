package com.zanusafiri.controller;

import com.zanusafiri.dto.BusRequest;
import com.zanusafiri.dto.BusResponse;
import com.zanusafiri.service.BusService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/buses")
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
public class BusController {

    private final BusService busService;

    @GetMapping
    public ResponseEntity<List<BusResponse>> getAllBuses(@RequestParam(required = false) Long routeId) {
        if (routeId != null) return ResponseEntity.ok(busService.getBusesByRoute(routeId));
        return ResponseEntity.ok(busService.getAllBuses());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusResponse> getBus(@PathVariable Long id) {
        return ResponseEntity.ok(busService.getBusById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusResponse> createBus(@RequestBody @Valid BusRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(busService.createBus(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusResponse> updateBus(@PathVariable Long id, @RequestBody @Valid BusRequest request) {
        return ResponseEntity.ok(busService.updateBus(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteBus(@PathVariable Long id) {
        busService.deleteBus(id);
        return ResponseEntity.noContent().build();
    }
}
