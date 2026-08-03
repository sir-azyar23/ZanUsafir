package com.zanusafiri.service;

import com.zanusafiri.dto.TicketRequest;
import com.zanusafiri.dto.TicketResponse;
import com.zanusafiri.entity.*;
import com.zanusafiri.repository.*;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class TicketService {

    private final TicketRepository ticketRepository;
    private final RouteRepository routeRepository;
    private final BusStopRepository busStopRepository;
    private final FareRepository fareRepository;
    private final AuthService authService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final SecureRandom secureRandom = new SecureRandom();

    public List<TicketResponse> getMyTickets() {
        User user = authService.getCurrentUser();
        return ticketRepository.findByUserIdOrderByCreatedAtDesc(user.getId())
            .stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public List<TicketResponse> getAllTickets() {
        return ticketRepository.findAll().stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public TicketResponse getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        User currentUser = authService.getCurrentUser();
        Long ticketOwnerId = ticket.getUser() == null ? null : ticket.getUser().getId();
        if (currentUser.getRole() != User.Role.ADMIN
            && (ticketOwnerId == null || !ticketOwnerId.equals(currentUser.getId()))) {
            throw new RuntimeException("You are not allowed to view this ticket");
        }
        return toResponse(ticket);
    }

    @Transactional
    public TicketResponse bookTicket(TicketRequest request) {
        User user = authService.getCurrentUser();
        String passengerName = user.getFullName();
        String passengerPhone = user.getPhoneNumber();
        return bookTicketInternal(request, user, passengerName, passengerPhone);
    }

    @Transactional
    public TicketResponse bookTicketPublic(TicketRequest request) {
        String passengerName = request.getPassengerName() == null ? "" : request.getPassengerName().trim();
        if (passengerName.isBlank()) {
            throw new RuntimeException("Passenger name is required");
        }
        String passengerPhone = request.getPassengerPhone() == null ? null : request.getPassengerPhone().trim();
        return bookTicketInternal(request, null, passengerName, passengerPhone);
    }

    private TicketResponse bookTicketInternal(TicketRequest request, User user, String passengerName, String passengerPhone) {
        Route route = routeRepository.findByIdWithStops(request.getRouteId())
            .orElseThrow(() -> new RuntimeException("Route not found"));
        if (route.getStatus() != Route.RouteStatus.ACTIVE) {
            throw new RuntimeException("This route is not available for booking");
        }

        BusStop fromStop = busStopRepository.findById(request.getFromStopId())
            .orElseThrow(() -> new RuntimeException("From stop not found"));
        BusStop toStop = busStopRepository.findById(request.getToStopId())
            .orElseThrow(() -> new RuntimeException("To stop not found"));

        if (fromStop.getId().equals(toStop.getId())) {
            throw new RuntimeException("From stop and To stop must be different");
        }

        validateStopsOnRoute(route, fromStop, toStop);

        Fare fare = fareRepository.findByRouteIdAndFromStopIdAndToStopId(
                route.getId(), fromStop.getId(), toStop.getId())
            .filter(f -> isActiveFare(f))
            .or(() -> fareRepository.findByRouteIdAndFromStopIdAndToStopId(
                route.getId(), toStop.getId(), fromStop.getId())
                .filter(this::isActiveFare))
            .orElseThrow(() -> new RuntimeException(
                "No fare configured for this stop pair. Please contact admin."));

        Ticket ticket = Ticket.builder()
            .ticketNumber(generateTicketNumber())
            .user(user)
            .passengerName(passengerName)
            .passengerPhone(passengerPhone)
            .route(route)
            .fromStop(fromStop)
            .toStop(toStop)
            .amount(fare.getAmount())
            .currency(fare.getCurrency())
            .status(Ticket.TicketStatus.BOOKED)
            .travelDate(request.getTravelDate())
            .build();

        Ticket saved = ticketRepository.save(ticket);
        auditLogService.log("CREATE", "Ticket", saved.getId(),
            "Booked ticket " + saved.getTicketNumber() + " for route " + route.getName());
        notificationService.notifyAdmins(
            "New Ticket Booked",
            "Ticket " + saved.getTicketNumber() + " booked by " + passengerName + " for route \"" + route.getName() + "\".",
            "TICKET"
        );
        return toResponse(saved);
    }

    @Transactional
    public TicketResponse cancelTicket(Long id) {
        Ticket ticket = ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        User currentUser = authService.getCurrentUser();
        Long ticketOwnerId = ticket.getUser() == null ? null : ticket.getUser().getId();
        if (currentUser.getRole() != User.Role.ADMIN
            && (ticketOwnerId == null || !ticketOwnerId.equals(currentUser.getId()))) {
            throw new RuntimeException("You are not allowed to cancel this ticket");
        }
        if (ticket.getStatus() != Ticket.TicketStatus.BOOKED) {
            throw new RuntimeException("Only booked tickets can be cancelled");
        }
        ticket.setStatus(Ticket.TicketStatus.CANCELLED);
        Ticket saved = ticketRepository.save(ticket);
        auditLogService.log("UPDATE", "Ticket", saved.getId(), "Cancelled ticket " + saved.getTicketNumber());
        notificationService.notifyAdmins(
            "Ticket Cancelled",
            "Ticket " + saved.getTicketNumber() + " has been cancelled.",
            "TICKET"
        );
        return toResponse(saved);
    }

    private void validateStopsOnRoute(Route route, BusStop from, BusStop to) {
        boolean hasFrom = route.getRouteStops().stream()
            .anyMatch(rs -> rs.getBusStop().getId().equals(from.getId()));
        boolean hasTo = route.getRouteStops().stream()
            .anyMatch(rs -> rs.getBusStop().getId().equals(to.getId()));
        if (!hasFrom || !hasTo) {
            throw new RuntimeException("Both stops must belong to the selected route");
        }
    }

    private boolean isActiveFare(Fare fare) {
        return fare.getStatus() == null || "ACTIVE".equalsIgnoreCase(fare.getStatus());
    }

    private String generateTicketNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randomPart = String.format("%04d", secureRandom.nextInt(10000));
        String candidate = "ZNZ-" + datePart + "-" + randomPart;
        while (ticketRepository.existsByTicketNumber(candidate)) {
            randomPart = String.format("%04d", secureRandom.nextInt(10000));
            candidate = "ZNZ-" + datePart + "-" + randomPart;
        }
        return candidate;
    }

    private TicketResponse toResponse(Ticket ticket) {
        return TicketResponse.builder()
            .id(ticket.getId())
            .ticketNumber(ticket.getTicketNumber())
            .userId(ticket.getUser() == null ? null : ticket.getUser().getId())
            .passengerName(ticket.getPassengerName())
            .routeId(ticket.getRoute().getId())
            .routeName(ticket.getRoute().getName())
            .fromStopId(ticket.getFromStop().getId())
            .fromStopName(ticket.getFromStop().getName())
            .toStopId(ticket.getToStop().getId())
            .toStopName(ticket.getToStop().getName())
            .amount(ticket.getAmount())
            .currency(ticket.getCurrency())
            .status(ticket.getStatus().name())
            .travelDate(ticket.getTravelDate())
            .createdAt(ticket.getCreatedAt())
            .build();
    }
}
