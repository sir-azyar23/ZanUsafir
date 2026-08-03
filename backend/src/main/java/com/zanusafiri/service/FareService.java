package com.zanusafiri.service;

import com.zanusafiri.dto.FareRequest;
import com.zanusafiri.dto.FareResponse;
import com.zanusafiri.entity.*;
import com.zanusafiri.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class FareService {

    private final FareRepository fareRepository;
    private final RouteRepository routeRepository;
    private final BusStopRepository busStopRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public List<FareResponse> getAllFares() {
        return fareRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<FareResponse> getFaresByRoute(Long routeId) {
        return fareRepository.findByRouteId(routeId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public FareResponse getFareById(Long id) {
        return toResponse(fareRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Fare not found: " + id)));
    }

    @Transactional
    public FareResponse createFare(FareRequest request) {
        Route route = routeRepository.findById(request.getRouteId())
            .orElseThrow(() -> new RuntimeException("Route not found"));
        BusStop from = busStopRepository.findById(request.getFromStopId())
            .orElseThrow(() -> new RuntimeException("From stop not found"));
        BusStop to = busStopRepository.findById(request.getToStopId())
            .orElseThrow(() -> new RuntimeException("To stop not found"));
        validateFareStops(route, from, to);
        validateFarePairAvailable(null, route.getId(), from.getId(), to.getId());

        Fare fare = Fare.builder()
            .route(route).fromStop(from).toStop(to)
            .amount(request.getAmount()).currency(resolveCurrency(request.getCurrency()))
            .status(request.getStatus() == null ? "ACTIVE" : request.getStatus().toUpperCase())
            .build();
        Fare saved = fareRepository.save(fare);
        auditLogService.log("CREATE", "Fare", saved.getId(), "Created fare: " + from.getName() + " -> " + to.getName());
        notificationService.notifyAdmins(
            "Fare Created",
            "New fare set for " + from.getName() + " → " + to.getName() + " on route \"" + route.getName() + "\".",
            "FARE"
        );
        return toResponse(saved);
    }

    @Transactional
    public FareResponse updateFare(Long id, FareRequest request) {
        Fare fare = fareRepository.findById(id).orElseThrow(() -> new RuntimeException("Fare not found"));
        Route route = routeRepository.findById(request.getRouteId())
            .orElseThrow(() -> new RuntimeException("Route not found"));
        BusStop from = busStopRepository.findById(request.getFromStopId())
            .orElseThrow(() -> new RuntimeException("From stop not found"));
        BusStop to = busStopRepository.findById(request.getToStopId())
            .orElseThrow(() -> new RuntimeException("To stop not found"));
        validateFareStops(route, from, to);
        validateFarePairAvailable(id, route.getId(), from.getId(), to.getId());

        fare.setRoute(route);
        fare.setFromStop(from);
        fare.setToStop(to);
        fare.setAmount(request.getAmount());
        fare.setCurrency(resolveCurrency(request.getCurrency()));
        fare.setStatus(request.getStatus() == null ? fare.getStatus() : request.getStatus().toUpperCase());
        Fare saved = fareRepository.save(fare);
        auditLogService.log("UPDATE", "Fare", saved.getId(), "Updated fare: " + from.getName() + " -> " + to.getName());
        notificationService.notifyAdmins(
            "Fare Updated",
            "Fare for " + from.getName() + " → " + to.getName() + " has been updated.",
            "FARE"
        );
        return toResponse(saved);
    }

    @Transactional
    public void deleteFare(Long id) {
        Fare fare = fareRepository.findById(id).orElseThrow(() -> new RuntimeException("Fare not found"));
        fareRepository.delete(fare);
        auditLogService.log("DELETE", "Fare", id, "Deleted fare");
        notificationService.notifyAdmins(
            "Fare Deleted",
            "A fare entry has been removed from the system.",
            "FARE"
        );
    }

    private FareResponse toResponse(Fare f) {
        return FareResponse.builder()
            .id(f.getId()).routeId(f.getRoute().getId()).routeName(f.getRoute().getName())
            .fromStopId(f.getFromStop().getId()).fromStopName(f.getFromStop().getName())
            .toStopId(f.getToStop().getId()).toStopName(f.getToStop().getName())
            .amount(f.getAmount()).status(f.getStatus() == null ? "ACTIVE" : f.getStatus()).currency(f.getCurrency())
            .createdAt(f.getCreatedAt()).updatedAt(f.getUpdatedAt())
            .build();
    }

    private void validateFareStops(Route route, BusStop from, BusStop to) {
        if (from.getId().equals(to.getId())) {
            throw new RuntimeException("From stop and To stop must be different");
        }

        boolean hasFromStop = route.getRouteStops().stream()
            .anyMatch(routeStop -> routeStop.getBusStop().getId().equals(from.getId()));
        boolean hasToStop = route.getRouteStops().stream()
            .anyMatch(routeStop -> routeStop.getBusStop().getId().equals(to.getId()));

        if (!hasFromStop || !hasToStop) {
            throw new RuntimeException("Both stops must belong to the selected route");
        }
    }

    private void validateFarePairAvailable(Long currentFareId, Long routeId, Long fromStopId, Long toStopId) {
        Optional<Fare> existingForward = fareRepository.findByRouteIdAndFromStopIdAndToStopId(routeId, fromStopId, toStopId);
        Optional<Fare> existingReverse = fareRepository.findByRouteIdAndFromStopIdAndToStopId(routeId, toStopId, fromStopId);

        boolean duplicate = existingForward
            .filter(fare -> currentFareId == null || !fare.getId().equals(currentFareId))
            .isPresent()
            || existingReverse
            .filter(fare -> currentFareId == null || !fare.getId().equals(currentFareId))
            .isPresent();

        if (duplicate) {
            throw new RuntimeException("Fare already exists for this stop pair on the selected route");
        }
    }

    private String resolveCurrency(String currency) {
        return currency == null || currency.isBlank() ? "TZS" : currency.toUpperCase();
    }
}
