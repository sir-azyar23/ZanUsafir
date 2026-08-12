package com.zanusafiri.service;

import com.zanusafiri.dto.RouteRequest;
import com.zanusafiri.dto.RouteResponse;
import com.zanusafiri.dto.RouteSettingsRequest;
import com.zanusafiri.entity.Bus;
import com.zanusafiri.entity.BusStop;
import com.zanusafiri.entity.Route;
import com.zanusafiri.entity.RouteStop;
import com.zanusafiri.repository.BusRepository;
import com.zanusafiri.repository.BusStopRepository;
import com.zanusafiri.repository.FareRepository;
import com.zanusafiri.repository.RouteRepository;
import com.zanusafiri.repository.RouteStopRepository;
import com.zanusafiri.repository.TicketRepository;
import com.zanusafiri.repository.GeneratedRouteRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class RouteService {

    private final RouteRepository routeRepository;
    private final RouteStopRepository routeStopRepository;
    private final BusStopRepository busStopRepository;
    private final FareRepository fareRepository;
    private final BusRepository busRepository;
    private final TicketRepository ticketRepository;
    private final GeneratedRouteRepository generatedRouteRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Transactional(readOnly = true)
    public List<RouteResponse> getAllRoutes() {
        return routeRepository.findAllWithStops().stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RouteResponse> searchRoutes(String keyword) {
        return routeRepository.search(keyword).stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RouteResponse getRouteById(Long id) {
        Route route = routeRepository.findByIdWithStops(id)
            .orElseThrow(() -> new RuntimeException("Route not found: " + id));
        return toResponse(route);
    }

    @Transactional
    public RouteResponse createRoute(RouteRequest request) {
        Route route = Route.builder()
            .name(request.getName())
            .routeNumber(request.getRouteNumber())
            .description(request.getDescription())
            .status(Route.RouteStatus.valueOf(request.getStatus().toUpperCase()))
            .startPoint(request.getStartPoint())
            .endPoint(request.getEndPoint())
            .startLat(request.getStartLat())
            .startLng(request.getStartLng())
            .endLat(request.getEndLat())
            .endLng(request.getEndLng())
            .distance(request.getDistance())
            .duration(request.getDuration())
            .encodedPolyline(request.getEncodedPolyline())
            .routeGeojson(request.getRouteGeojson())
            .studentFare(request.getStudentFare())
            .adultFare(request.getAdultFare())
            .seniorFare(request.getSeniorFare())
            .assignedBusesCount(request.getAssignedBusesCount())
            .routeStops(new ArrayList<>())
            .buses(new HashSet<>())
            .build();
        Route saved = routeRepository.save(route);
        auditLogService.log("CREATE", "Route", saved.getId(), "Created route: " + saved.getName());
        notificationService.notifyAdmins(
            "New Route Created",
            "Route \"" + saved.getName() + "\" (" + saved.getRouteNumber() + ") has been added to the system.",
            "ROUTE"
        );
        return toResponse(saved);
    }

    @Transactional
    public RouteResponse updateRoute(Long id, RouteRequest request) {
        Route route = routeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Route not found: " + id));
        route.setName(request.getName());
        route.setRouteNumber(request.getRouteNumber());
        route.setDescription(request.getDescription());
        route.setStatus(Route.RouteStatus.valueOf(request.getStatus().toUpperCase()));
        route.setStartPoint(request.getStartPoint());
        route.setEndPoint(request.getEndPoint());
        route.setStartLat(request.getStartLat());
        route.setStartLng(request.getStartLng());
        route.setEndLat(request.getEndLat());
        route.setEndLng(request.getEndLng());
        route.setDistance(request.getDistance());
        route.setDuration(request.getDuration());
        route.setEncodedPolyline(request.getEncodedPolyline());
        route.setRouteGeojson(request.getRouteGeojson());
        if (request.getStudentFare() != null) route.setStudentFare(request.getStudentFare());
        if (request.getAdultFare() != null) route.setAdultFare(request.getAdultFare());
        if (request.getSeniorFare() != null) route.setSeniorFare(request.getSeniorFare());
        if (request.getAssignedBusesCount() != null) route.setAssignedBusesCount(request.getAssignedBusesCount());
        Route saved = routeRepository.save(route);
        auditLogService.log("UPDATE", "Route", saved.getId(), "Updated route: " + saved.getName());
        notificationService.notifyAdmins(
            "Route Updated",
            "Route \"" + saved.getName() + "\" has been updated.",
            "ROUTE"
        );
        return toResponse(saved);
    }

    @Transactional
    public RouteResponse updateRouteSettings(Long id, RouteSettingsRequest request) {
        Route route = routeRepository.findById(id)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "Route not found: " + id));

        if (request.getStudentFare() != null) route.setStudentFare(request.getStudentFare());
        if (request.getAdultFare() != null) route.setAdultFare(request.getAdultFare());
        if (request.getSeniorFare() != null) route.setSeniorFare(request.getSeniorFare());
        if (request.getAssignedBusesCount() != null) route.setAssignedBusesCount(request.getAssignedBusesCount());

        Route saved = routeRepository.save(route);
        auditLogService.log("UPDATE", "Route", saved.getId(), "Updated route settings for: " + saved.getName());
        notificationService.notifyAdmins(
            "Route Settings Updated",
            "Fares and bus assignment for route \"" + saved.getName() + "\" have been updated.",
            "ROUTE"
        );
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public RouteResponse getRouteSettings(Long id) {
        Route route = routeRepository.findById(id)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "Route not found: " + id));
        if (route.getStudentFare() == null || route.getAdultFare() == null ||
            route.getSeniorFare() == null || route.getAssignedBusesCount() == null) {
            return null;
        }
        return toResponse(route);
    }

    @Transactional
    public void deleteRoute(Long id) {
        Route route = routeRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Route not found: " + id));

        // 1. Delete all tickets that reference this route
        ticketRepository.deleteByRouteId(id);

        // 2. Delete all generated routes that reference this route
        generatedRouteRepository.deleteAll(generatedRouteRepository.findByRouteId(id));

        // 3. Delete all fares that reference this route (FK is NOT NULL)
        fareRepository.deleteAll(fareRepository.findByRouteId(id));

        // 4. Unlink buses assigned to this route (FK is nullable → set to null)
        List<Bus> buses = busRepository.findByRouteId(id);
        buses.forEach(b -> b.setRoute(null));
        busRepository.saveAll(buses);

        // 5. Now safe to delete (routeStops cascade via CascadeType.ALL)
        routeRepository.delete(route);
        auditLogService.log("DELETE", "Route", id, "Deleted route: " + route.getName());
        notificationService.notifyAdmins(
            "Route Deleted",
            "Route \"" + route.getName() + "\" has been removed from the system.",
            "ROUTE"
        );
    }

    @Transactional
    public RouteResponse addStopToRoute(Long routeId, Long stopId, Integer order, Double mapX, Double mapY) {
        Route route = routeRepository.findById(routeId)
            .orElseThrow(() -> new RuntimeException("Route not found: " + routeId));
        BusStop stop = busStopRepository.findById(stopId)
            .orElseThrow(() -> new RuntimeException("Stop not found: " + stopId));

        RouteStop routeStop = RouteStop.builder()
            .route(route)
            .busStop(stop)
            .stopOrder(order)
            .mapX(mapX)
            .mapY(mapY)
            .build();
        routeStopRepository.save(routeStop);
        auditLogService.log("UPDATE", "Route", routeId, "Added stop " + stop.getName() + " to route");
        return toResponse(routeRepository.findByIdWithStops(routeId)
            .orElseThrow(() -> new RuntimeException("Route not found: " + routeId)));
    }

    @Transactional
    public RouteResponse removeStopFromRoute(Long routeId, Long routeStopId) {
        routeStopRepository.deleteById(routeStopId);
        auditLogService.log("UPDATE", "Route", routeId, "Removed stop from route");
        return toResponse(routeRepository.findByIdWithStops(routeId)
            .orElseThrow(() -> new RuntimeException("Route not found")));
    }

    @Transactional
    public RouteResponse updateRouteStop(Long routeId, Long routeStopId, Integer order, Double mapX, Double mapY) {
        RouteStop routeStop = routeStopRepository.findById(routeStopId)
            .orElseThrow(() -> new RuntimeException("Route stop not found: " + routeStopId));

        if (!routeStop.getRoute().getId().equals(routeId)) {
            throw new RuntimeException("Route stop does not belong to the selected route");
        }

        if (order != null) routeStop.setStopOrder(order);
        routeStop.setMapX(mapX);
        routeStop.setMapY(mapY);
        routeStopRepository.save(routeStop);
        auditLogService.log("UPDATE", "Route", routeId, "Updated stop map position");

        return toResponse(routeRepository.findByIdWithStops(routeId)
            .orElseThrow(() -> new RuntimeException("Route not found")));
    }

    private RouteResponse toResponse(Route route) {
        List<RouteResponse.RouteStopResponse> stops = route.getRouteStops() == null ? new ArrayList<>() :
            route.getRouteStops().stream().map(rs -> RouteResponse.RouteStopResponse.builder()
                .id(rs.getId())
                .stopId(rs.getBusStop().getId())
                .stopName(rs.getBusStop().getName())
                .stopCode(rs.getBusStop().getStopCode())
                .address(rs.getBusStop().getAddress())
                .latitude(rs.getBusStop().getLatitude())
                .longitude(rs.getBusStop().getLongitude())
                .stopOrder(rs.getStopOrder())
                .mapX(rs.getMapX())
                .mapY(rs.getMapY())
                .build()).collect(Collectors.toList());

        return RouteResponse.builder()
            .id(route.getId())
            .name(route.getName())
            .routeNumber(route.getRouteNumber())
            .description(route.getDescription())
            .startPoint(route.getStartPoint())
            .endPoint(route.getEndPoint())
            .startLat(route.getStartLat())
            .startLng(route.getStartLng())
            .endLat(route.getEndLat())
            .endLng(route.getEndLng())
            .distance(route.getDistance())
            .duration(route.getDuration())
            .encodedPolyline(route.getEncodedPolyline())
            .routeGeojson(route.getRouteGeojson())
            .status(route.getStatus().name())
            .stops(stops)
            .busCount(route.getBuses() == null ? 0 : route.getBuses().size())
            .studentFare(route.getStudentFare())
            .adultFare(route.getAdultFare())
            .seniorFare(route.getSeniorFare())
            .assignedBusesCount(route.getAssignedBusesCount())
            .createdAt(route.getCreatedAt())
            .updatedAt(route.getUpdatedAt())
            .build();
     }

    @Transactional
    public void assignBusesToRoute(Long routeId, List<Long> busIds) {
        Route route = routeRepository.findById(routeId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "Route not found: " + routeId));

        // Unassign all buses currently assigned to this route
        List<Bus> currentBuses = busRepository.findByRouteId(routeId);
        for (Bus bus : currentBuses) {
            bus.setRoute(null);
            busRepository.save(bus);
        }

        // Assign the new set of buses
        if (busIds != null) {
            for (Long busId : busIds) {
                Bus bus = busRepository.findById(busId)
                    .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Bus not found: " + busId));
                bus.setRoute(route);
                busRepository.save(bus);
            }
        }

        // Also update the route's assignedBusesCount field in the database
        route.setAssignedBusesCount(busIds != null ? busIds.size() : 0);
        routeRepository.save(route);

        auditLogService.log("UPDATE", "Route", routeId, "Assigned buses to route: " + route.getName());
    }

    @Transactional(readOnly = true)
    public int getAssignedBusesCount(Long routeId) {
        return busRepository.findByRouteId(routeId).size();
    }

    @Transactional(readOnly = true)
    public int getBusStopsCount(Long routeId) {
        Route route = routeRepository.findByIdWithStops(routeId)
            .orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "Route not found: " + routeId));
        return route.getRouteStops() != null ? route.getRouteStops().size() : 0;
    }
}
