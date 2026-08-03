package com.zanusafiri.service;

import com.zanusafiri.dto.BusRequest;
import com.zanusafiri.dto.BusResponse;
import com.zanusafiri.entity.Bus;
import com.zanusafiri.entity.Driver;
import com.zanusafiri.entity.Route;
import com.zanusafiri.repository.BusRepository;
import com.zanusafiri.repository.DriverRepository;
import com.zanusafiri.repository.RouteRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class BusService {

    private final BusRepository busRepository;
    private final RouteRepository routeRepository;
    private final DriverRepository driverRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public List<BusResponse> getAllBuses() {
        return busRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<BusResponse> getBusesByRoute(Long routeId) {
        return busRepository.findByRouteId(routeId).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public BusResponse getBusById(Long id) {
        return toResponse(busRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bus not found: " + id)));
    }

    @Transactional
    public BusResponse createBus(BusRequest request) {
        if (busRepository.existsByPlateNumber(request.getPlateNumber())) {
            throw new RuntimeException("Bus with plate number already exists: " + request.getPlateNumber());
        }
        Route route = null;
        if (request.getRouteId() != null) {
            route = routeRepository.findById(request.getRouteId())
                .orElseThrow(() -> new RuntimeException("Route not found: " + request.getRouteId()));
        }
        Bus bus = Bus.builder()
            .busNumber(request.getBusNumber())
            .plateNumber(request.getPlateNumber())
            .capacity(request.getCapacity())
            .model(request.getModel())
            .color(request.getColor())
            .status(Bus.BusStatus.valueOf(request.getStatus().toUpperCase()))
            .route(route)
            .build();
        Bus saved = busRepository.save(bus);
        auditLogService.log("CREATE", "Bus", saved.getId(), "Created bus: " + saved.getPlateNumber());
        notificationService.notifyAdmins(
            "New Bus Registered",
            "Bus " + saved.getPlateNumber() + " (" + saved.getBusNumber() + ") has been registered in the system.",
            "BUS"
        );
        return toResponse(saved);
    }

    @Transactional
    public BusResponse updateBus(Long id, BusRequest request) {
        Bus bus = busRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bus not found: " + id));
        Route route = null;
        if (request.getRouteId() != null) {
            route = routeRepository.findById(request.getRouteId())
                .orElseThrow(() -> new RuntimeException("Route not found: " + request.getRouteId()));
        }
        bus.setBusNumber(request.getBusNumber());
        bus.setPlateNumber(request.getPlateNumber());
        bus.setCapacity(request.getCapacity());
        bus.setModel(request.getModel());
        bus.setColor(request.getColor());
        bus.setStatus(Bus.BusStatus.valueOf(request.getStatus().toUpperCase()));
        bus.setRoute(route);
        Bus saved = busRepository.save(bus);
        auditLogService.log("UPDATE", "Bus", saved.getId(), "Updated bus: " + saved.getPlateNumber());
        notificationService.notifyAdmins(
            "Bus Information Updated",
            "Bus " + saved.getPlateNumber() + " information has been updated.",
            "BUS"
        );
        return toResponse(saved);
    }

    @Transactional
    public void deleteBus(Long id) {
        Bus bus = busRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Bus not found: " + id));

        Driver assignedDriver = bus.getDriver();
        if (assignedDriver != null) {
            assignedDriver.setBus(null);
            bus.setDriver(null);
            driverRepository.save(assignedDriver);
        }

        busRepository.delete(bus);
        auditLogService.log("DELETE", "Bus", id, "Deleted bus: " + bus.getPlateNumber());
        notificationService.notifyAdmins(
            "Bus Removed",
            "Bus " + bus.getPlateNumber() + " has been removed from the system.",
            "BUS"
        );
    }

    private BusResponse toResponse(Bus bus) {
        return BusResponse.builder()
            .id(bus.getId())
            .busNumber(bus.getBusNumber())
            .plateNumber(bus.getPlateNumber())
            .capacity(bus.getCapacity())
            .model(bus.getModel())
            .color(bus.getColor())
            .status(bus.getStatus().name())
            .routeId(bus.getRoute() != null ? bus.getRoute().getId() : null)
            .routeName(bus.getRoute() != null ? bus.getRoute().getName() : null)
            .driverName(bus.getDriver() != null ? bus.getDriver().getFullName() : null)
            .driverId(bus.getDriver() != null ? bus.getDriver().getId() : null)
            .createdAt(bus.getCreatedAt())
            .build();
    }
}
