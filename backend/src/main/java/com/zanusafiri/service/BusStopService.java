package com.zanusafiri.service;

import com.zanusafiri.dto.BusStopRequest;
import com.zanusafiri.dto.BusStopResponse;
import com.zanusafiri.entity.BusStop;
import com.zanusafiri.repository.BusStopRepository;
import com.zanusafiri.repository.FareRepository;
import com.zanusafiri.repository.RouteStopRepository;
import com.zanusafiri.repository.TicketRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class BusStopService {

    private final BusStopRepository busStopRepository;
    private final FareRepository fareRepository;
    private final RouteStopRepository routeStopRepository;
    private final TicketRepository ticketRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    public List<BusStopResponse> getAllStops() {
        return busStopRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    public List<BusStopResponse> searchStops(String keyword) {
        return busStopRepository.searchByName(keyword).stream().map(this::toResponse).collect(Collectors.toList());
    }

    public BusStopResponse getStopById(Long id) {
        return toResponse(busStopRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Stop not found: " + id)));
    }

    @Transactional
    public BusStopResponse createStop(BusStopRequest request) {
        BusStop stop = BusStop.builder()
            .name(request.getName())
            .stopCode(request.getStopCode())
            .address(request.getAddress())
            .latitude(request.getLatitude())
            .longitude(request.getLongitude())
            .status(BusStop.StopStatus.valueOf(request.getStatus().toUpperCase()))
            .build();
        BusStop saved = busStopRepository.save(stop);
        auditLogService.log("CREATE", "BusStop", saved.getId(), "Created stop: " + saved.getName());
        notificationService.notifyAdmins(
            "New Bus Stop Added",
            "Bus stop \"" + saved.getName() + "\" (" + saved.getStopCode() + ") has been added to the system.",
            "BUS_STOP"
        );
        return toResponse(saved);
    }

    @Transactional
    public BusStopResponse updateStop(Long id, BusStopRequest request) {
        BusStop stop = busStopRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Stop not found: " + id));
        stop.setName(request.getName());
        stop.setStopCode(request.getStopCode());
        stop.setAddress(request.getAddress());
        stop.setLatitude(request.getLatitude());
        stop.setLongitude(request.getLongitude());
        stop.setStatus(BusStop.StopStatus.valueOf(request.getStatus().toUpperCase()));
        BusStop saved = busStopRepository.save(stop);
        auditLogService.log("UPDATE", "BusStop", saved.getId(), "Updated stop: " + saved.getName());
        notificationService.notifyAdmins(
            "Bus Stop Updated",
            "Bus stop \"" + saved.getName() + "\" information has been updated.",
            "BUS_STOP"
        );
        return toResponse(saved);
    }

    @Transactional
    public void deleteStop(Long id) {
        BusStop stop = busStopRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Stop not found: " + id));

        ticketRepository.deleteByFromStopIdOrToStopId(id, id);
        fareRepository.deleteAll(fareRepository.findByFromStopIdOrToStopId(id, id));
        routeStopRepository.deleteByBusStopId(id);
        busStopRepository.delete(stop);
        auditLogService.log("DELETE", "BusStop", id, "Deleted stop: " + stop.getName());
        notificationService.notifyAdmins(
            "Bus Stop Removed",
            "Bus stop \"" + stop.getName() + "\" has been removed from the system.",
            "BUS_STOP"
        );
    }

    private BusStopResponse toResponse(BusStop stop) {
        return BusStopResponse.builder()
            .id(stop.getId())
            .name(stop.getName())
            .stopCode(stop.getStopCode())
            .address(stop.getAddress())
            .latitude(stop.getLatitude())
            .longitude(stop.getLongitude())
            .status(stop.getStatus().name())
            .createdAt(stop.getCreatedAt())
            .build();
    }
}
