package com.zanusafiri.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.zanusafiri.dto.GeneratedRouteRequest;
import com.zanusafiri.dto.GeneratedRouteResponse;
import com.zanusafiri.entity.GeneratedRoute;
import com.zanusafiri.entity.Route;
import com.zanusafiri.repository.BusRepository;
import com.zanusafiri.repository.DriverRepository;
import com.zanusafiri.repository.GeneratedRouteRepository;
import com.zanusafiri.repository.RouteRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class GeneratedRouteService {

    private final GeneratedRouteRepository generatedRouteRepository;
    private final RouteRepository routeRepository;
    private final DriverRepository driverRepository;
    private final BusRepository busRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper;

    public List<GeneratedRouteResponse> getGeneratedRoutes(Long routeId, String status) {
        List<GeneratedRoute> routes;
        if (routeId != null) {
            routes = generatedRouteRepository.findByRouteId(routeId);
        } else if (status != null && !status.isBlank()) {
            routes = generatedRouteRepository.findByStatusIgnoreCase(status);
        } else {
            routes = generatedRouteRepository.findAll();
        }
        return routes.stream().map(this::toResponse).collect(Collectors.toList());
    }

    public GeneratedRouteResponse getGeneratedRoute(Long id) {
        return toResponse(generatedRouteRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Generated route not found: " + id)));
    }

    @Transactional
    public GeneratedRouteResponse createGeneratedRoute(GeneratedRouteRequest request) {
        Route route = routeRepository.findById(request.getRouteId())
            .orElseThrow(() -> new RuntimeException("Route not found: " + request.getRouteId()));
        validateSelectedStops(route, request.getSelectedStops());
        validateCompleteRouteSetup(request.getMapData());

        GeneratedRoute generatedRoute = GeneratedRoute.builder()
            .route(route)
            .name(request.getName())
            .selectedStops(request.getSelectedStops())
            .mapData(request.getMapData())
            .status(normalizeStatus(request.getStatus() == null ? "SUBMITTED" : request.getStatus()))
            .build();

        GeneratedRoute saved = generatedRouteRepository.save(generatedRoute);
        auditLogService.log("CREATE", "GeneratedRoute", saved.getId(), "Saved generated route: " + saved.getName());
        return toResponse(saved);
    }

    @Transactional
    public GeneratedRouteResponse approveRoute(Long id, String comment) {
        GeneratedRoute route = getReviewableRoute(id);
        route.setStatus("APPROVED");
        route.setReviewComment(comment);
        applyReviewer(route);
        GeneratedRoute saved = generatedRouteRepository.save(route);
        auditLogService.log("APPROVE", "GeneratedRoute", saved.getId(), "Approved route: " + saved.getName());
        return toResponse(saved);
    }

    @Transactional
    public GeneratedRouteResponse activateRoute(Long id, String comment) {
        GeneratedRoute route = getReviewableRoute(id);
        route.setStatus("ACTIVE");
        route.setReviewComment(comment);
        applyReviewer(route);
        GeneratedRoute saved = generatedRouteRepository.save(route);
        auditLogService.log("ACTIVATE", "GeneratedRoute", saved.getId(), "Activated route: " + saved.getName());
        return toResponse(saved);
    }

    @Transactional
    public GeneratedRouteResponse rejectRoute(Long id, String comment) {
        if (comment == null || comment.isBlank()) {
            throw new RuntimeException("Rejection comment is required.");
        }
        GeneratedRoute route = getReviewableRoute(id);
        route.setStatus("REJECTED");
        route.setReviewComment(comment.trim());
        applyReviewer(route);
        GeneratedRoute saved = generatedRouteRepository.save(route);
        auditLogService.log("REJECT", "GeneratedRoute", saved.getId(), "Rejected route: " + saved.getName());
        return toResponse(saved);
    }

    private GeneratedRoute getReviewableRoute(Long id) {
        GeneratedRoute route = generatedRouteRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Generated route not found: " + id));
        if (!"SUBMITTED".equalsIgnoreCase(route.getStatus()) && !"APPROVED".equalsIgnoreCase(route.getStatus())) {
            throw new RuntimeException("Only submitted or approved routes can be reviewed.");
        }
        return route;
    }

    private void applyReviewer(GeneratedRoute route) {
        route.setReviewedBy(SecurityContextHolder.getContext().getAuthentication().getName());
        route.setReviewedAt(LocalDateTime.now());
    }

    private String normalizeStatus(String status) {
        String normalized = status == null ? "SUBMITTED" : status.trim().toUpperCase();
        if (normalized.isBlank()) return "SUBMITTED";
        if (Set.of("DRAFT", "SUBMITTED", "APPROVED", "ACTIVE", "REJECTED").contains(normalized)) {
            return normalized;
        }
        throw new RuntimeException("Invalid route status: " + status);
    }

    private void validateSelectedStops(Route route, String selectedStopsJson) {
        try {
            JsonNode selectedStops = objectMapper.readTree(selectedStopsJson);
            if (!selectedStops.isArray() || selectedStops.size() < 2) {
                throw new RuntimeException("Select at least two existing bus stops for the generated route.");
            }

            Set<Long> allowedStopIds = route.getRouteStops().stream()
                .map(routeStop -> routeStop.getBusStop().getId())
                .collect(Collectors.toSet());

            for (JsonNode stop : selectedStops) {
                JsonNode stopIdNode = stop.get("stopId");
                if (stopIdNode == null || !stopIdNode.canConvertToLong()) {
                    throw new RuntimeException("Generated route contains an invalid bus stop.");
                }
                if (!allowedStopIds.contains(stopIdNode.asLong())) {
                    throw new RuntimeException("Generated route must use bus stops prepared by Admin for the selected route.");
                }
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Generated route stops must be valid route data.");
        }
    }

    private void validateCompleteRouteSetup(String mapDataJson) {
        if (mapDataJson == null || mapDataJson.isBlank()) return;

        try {
            JsonNode mapData = objectMapper.readTree(mapDataJson);
            JsonNode typeNode = mapData.get("type");
            if (typeNode == null || !"COMPLETE_ROUTE_SETUP".equals(typeNode.asText())) return;

            JsonNode driverIdNode = mapData.get("driverId");
            JsonNode busIdNode = mapData.get("busId");
            JsonNode fareDetails = mapData.get("fareDetails");

            if (driverIdNode == null || !driverIdNode.canConvertToLong() || !driverRepository.existsById(driverIdNode.asLong())) {
                throw new RuntimeException("Selected driver must exist in Admin-prepared data.");
            }

            if (busIdNode == null || !busIdNode.canConvertToLong() || !busRepository.existsById(busIdNode.asLong())) {
                throw new RuntimeException("Selected bus must exist in Admin-prepared data.");
            }

            if (fareDetails == null || !fareDetails.isArray() || fareDetails.isEmpty()) {
                throw new RuntimeException("Fare details are required for the complete route setup.");
            }

            for (JsonNode fare : fareDetails) {
                JsonNode fromStopId = fare.get("fromStopId");
                JsonNode toStopId = fare.get("toStopId");
                JsonNode amount = fare.get("amount");
                if (fromStopId == null || !fromStopId.canConvertToLong()
                    || toStopId == null || !toStopId.canConvertToLong()
                    || amount == null || !amount.isNumber() || amount.asDouble() < 0) {
                    throw new RuntimeException("Fare details must contain valid stop segments and non-negative amounts.");
                }
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Complete route setup data must be valid.");
        }
    }

    private GeneratedRouteResponse toResponse(GeneratedRoute route) {
        return GeneratedRouteResponse.builder()
            .id(route.getId())
            .routeId(route.getRoute().getId())
            .routeName(route.getRoute().getName())
            .name(route.getName())
            .selectedStops(route.getSelectedStops())
            .mapData(route.getMapData())
            .status(route.getStatus())
            .reviewComment(route.getReviewComment())
            .reviewedBy(route.getReviewedBy())
            .reviewedAt(route.getReviewedAt())
            .createdAt(route.getCreatedAt())
            .updatedAt(route.getUpdatedAt())
            .build();
    }
}
