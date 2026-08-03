package com.zanusafiri.controller;

import com.zanusafiri.dto.RouteRequest;
import com.zanusafiri.dto.RouteResponse;
import com.zanusafiri.dto.RouteSettingsRequest;
import com.zanusafiri.service.RouteService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/routes")
@RequiredArgsConstructor
public class RouteController {

    private final RouteService routeService;

    @GetMapping
    public ResponseEntity<List<RouteResponse>> getAllRoutes(
            @RequestParam(required = false) String search) {
        if (search != null && !search.isBlank()) {
            return ResponseEntity.ok(routeService.searchRoutes(search));
        }
        return ResponseEntity.ok(routeService.getAllRoutes());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RouteResponse> getRoute(@PathVariable Long id) {
        return ResponseEntity.ok(routeService.getRouteById(id));
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RouteResponse> createRoute(@RequestBody @Valid RouteRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(routeService.createRoute(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RouteResponse> updateRoute(@PathVariable Long id,
                                                      @RequestBody @Valid RouteRequest request) {
        return ResponseEntity.ok(routeService.updateRoute(id, request));
    }

    @PutMapping("/{id}/settings")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RouteResponse> updateRouteSettings(@PathVariable Long id,
                                                              @RequestBody RouteSettingsRequest request) {
        return ResponseEntity.ok(routeService.updateRouteSettings(id, request));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteRoute(@PathVariable Long id) {
        routeService.deleteRoute(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{routeId}/stops")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RouteResponse> addStop(@PathVariable Long routeId,
                                                  @RequestParam Long stopId,
                                                  @RequestParam Integer order,
                                                  @RequestParam(required = false) Double mapX,
                                                  @RequestParam(required = false) Double mapY) {
        return ResponseEntity.ok(routeService.addStopToRoute(routeId, stopId, order, mapX, mapY));
    }

    @PutMapping("/{routeId}/stops/{routeStopId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RouteResponse> updateStop(@PathVariable Long routeId,
                                                     @PathVariable Long routeStopId,
                                                     @RequestParam(required = false) Integer order,
                                                     @RequestParam(required = false) Double mapX,
                                                     @RequestParam(required = false) Double mapY) {
        return ResponseEntity.ok(routeService.updateRouteStop(routeId, routeStopId, order, mapX, mapY));
    }

    @DeleteMapping("/{routeId}/stops/{routeStopId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<RouteResponse> removeStop(@PathVariable Long routeId,
                                                     @PathVariable Long routeStopId) {
        return ResponseEntity.ok(routeService.removeStopFromRoute(routeId, routeStopId));
    }
}
