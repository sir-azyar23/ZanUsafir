package com.zanusafiri.controller;

import com.zanusafiri.dto.BusStopRequest;
import com.zanusafiri.dto.BusStopResponse;
import com.zanusafiri.service.BusStopService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/stops")
@RequiredArgsConstructor
public class BusStopController {

    private final BusStopService busStopService;

    @GetMapping
    public ResponseEntity<List<BusStopResponse>> getAllStops(@RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) return ResponseEntity.ok(busStopService.searchStops(search));
        return ResponseEntity.ok(busStopService.getAllStops());
    }

    @GetMapping("/{id}")
    public ResponseEntity<BusStopResponse> getStop(@PathVariable Long id) {
        return ResponseEntity.ok(busStopService.getStopById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusStopResponse> createStop(@RequestBody @Valid BusStopRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(busStopService.createStop(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<BusStopResponse> updateStop(@PathVariable Long id,
                                                       @RequestBody @Valid BusStopRequest request) {
        return ResponseEntity.ok(busStopService.updateStop(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteStop(@PathVariable Long id) {
        busStopService.deleteStop(id);
        return ResponseEntity.noContent().build();
    }
}
