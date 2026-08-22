package com.zanusafiri.service;

import com.zanusafiri.dto.TicketRequest;
import com.zanusafiri.dto.TicketResponse;
import com.zanusafiri.dto.TicketVerifyResponse;
import com.zanusafiri.entity.*;
import com.zanusafiri.repository.*;
import jakarta.transaction.Transactional;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class TicketService {

    private final TicketRepository ticketRepository;
    private final RouteRepository routeRepository;
    private final BusStopRepository busStopRepository;
    private final AuthService authService;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;
    private final SecureRandom secureRandom = new SecureRandom();

    // ── Fare resolution ──────────────────────────────────────────────────────

    /**
     * Resolves the fare for a route+passengerType combination from the route entity fields
     * (studentFare, adultFare, seniorFare).  Never trusts a client-supplied amount.
     */
    private BigDecimal resolveFare(Route route, String passengerType) {
        if (passengerType == null) throw new RuntimeException("Passenger type is required");
        return switch (passengerType.toUpperCase()) {
            case "STUDENT" -> {
                if (route.getStudentFare() == null) throw new RuntimeException("No student fare configured for this route");
                yield route.getStudentFare();
            }
            case "ADULT" -> {
                if (route.getAdultFare() == null) throw new RuntimeException("No adult fare configured for this route");
                yield route.getAdultFare();
            }
            case "SENIOR" -> {
                if (route.getSeniorFare() == null) throw new RuntimeException("No senior fare configured for this route");
                yield route.getSeniorFare();
            }
            default -> throw new RuntimeException("Unknown passenger type: " + passengerType);
        };
    }

    // ── Public API: Fare check (no auth required) ────────────────────────────

    public BigDecimal getFareForRoute(Long routeId, String passengerType) {
        Route route = routeRepository.findById(routeId)
            .orElseThrow(() -> new RuntimeException("Route not found"));
        if (route.getStatus() != Route.RouteStatus.ACTIVE) {
            throw new RuntimeException("Route is not active");
        }
        return resolveFare(route, passengerType);
    }

    // ── Get my tickets ───────────────────────────────────────────────────────

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

    public Page<TicketResponse> searchAdminTickets(
            String search,
            LocalDate dateFrom,
            LocalDate dateTo,
            Long routeId,
            String passengerType,
            String paymentMethod,
            String paymentStatus,
            String ticketStatus,
            Pageable pageable) {
        return ticketRepository.findAll(ticketSpecification(search, dateFrom, dateTo, routeId,
                passengerType, paymentMethod, paymentStatus, ticketStatus), pageable)
            .map(this::toResponse);
    }

    public Map<String, Object> getTicketSalesSummary() {
        LocalDateTime start = LocalDate.now().atStartOfDay();
        LocalDateTime end = LocalDate.now().atTime(LocalTime.MAX);
        List<Ticket> tickets = ticketRepository.findAll();

        BigDecimal totalSalesToday = tickets.stream()
            .filter(ticket -> ticket.getCreatedAt() != null
                && !ticket.getCreatedAt().isBefore(start)
                && !ticket.getCreatedAt().isAfter(end)
                && ticket.getPaymentStatus() == Ticket.PaymentStatus.PAID)
            .map(Ticket::getAmount)
            .reduce(BigDecimal.ZERO, BigDecimal::add);

        long ticketsSold = tickets.stream()
            .filter(ticket -> ticket.getPaymentStatus() == Ticket.PaymentStatus.PAID
                && ticket.getStatus() != Ticket.TicketStatus.NOT_ISSUED)
            .count();
        long activeTickets = tickets.stream()
            .filter(ticket -> ticket.getPaymentStatus() == Ticket.PaymentStatus.PAID
                && ticket.getStatus() == Ticket.TicketStatus.ACTIVE)
            .count();
        long usedTickets = tickets.stream()
            .filter(ticket -> ticket.getPaymentStatus() == Ticket.PaymentStatus.PAID
                && ticket.getStatus() == Ticket.TicketStatus.USED)
            .count();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalSalesToday", totalSalesToday);
        summary.put("ticketsSold", ticketsSold);
        summary.put("activeTickets", activeTickets);
        summary.put("usedTickets", usedTickets);
        return summary;
    }

    public String exportAdminTicketsCsv(String search, LocalDate dateFrom, LocalDate dateTo, Long routeId,
                                        String passengerType, String paymentMethod, String paymentStatus,
                                        String ticketStatus) {
        List<Ticket> tickets = ticketRepository.findAll(ticketSpecification(search, dateFrom, dateTo, routeId,
            passengerType, paymentMethod, paymentStatus, ticketStatus));
        StringBuilder csv = new StringBuilder();
        csv.append("Ticket Reference,Passenger,Phone,Route,Passenger Type,Amount,Payment Method,Payment Status,Ticket Status,Transaction Reference,Purchased Date,Scanned Date\n");
        for (Ticket ticket : tickets) {
            csv.append(csv(ticket.getReferenceNumber())).append(',')
                .append(csv(ticket.getPassengerName())).append(',')
                .append(csv(ticket.getPassengerPhone())).append(',')
                .append(csv(ticket.getRoute() == null ? "" : ticket.getRoute().getName())).append(',')
                .append(csv(ticket.getPassengerType())).append(',')
                .append(csv(ticket.getAmount())).append(',')
                .append(csv(ticket.getPaymentMethod())).append(',')
                .append(csv(ticket.getPaymentStatus() == null ? "" : ticket.getPaymentStatus().name())).append(',')
                .append(csv(ticket.getStatus() == null ? "" : ticket.getStatus().name())).append(',')
                .append(csv(ticket.getTransactionReference())).append(',')
                .append(csv(ticket.getCreatedAt())).append(',')
                .append(csv(ticket.getScannedAt())).append('\n');
        }
        return csv.toString();
    }

    public TicketResponse getTicketById(Long id) {
        Ticket ticket = ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        try {
            User currentUser = authService.getCurrentUser();
            Long ticketOwnerId = ticket.getUser() == null ? null : ticket.getUser().getId();
            if (currentUser.getRole() != User.Role.ADMIN
                && (ticketOwnerId == null || !ticketOwnerId.equals(currentUser.getId()))) {
                throw new RuntimeException("You are not allowed to view this ticket");
            }
        } catch (RuntimeException e) {
            if (e.getMessage().contains("not allowed")) throw e;
            // Not authenticated → allow if it's a public lookup
        }
        return toResponse(ticket);
    }

    // ── Purchase ticket (authenticated user) ─────────────────────────────────

    @Transactional
    public TicketResponse purchaseTicket(TicketRequest request) {
        User user = authService.getCurrentUser();
        return purchaseInternal(request, user, user.getFullName(), user.getPhoneNumber());
    }

    // ── Purchase ticket (public / unauthenticated) ───────────────────────────

    @Transactional
    public TicketResponse purchaseTicketPublic(TicketRequest request) {
        String name = request.getPassengerName() == null ? "" : request.getPassengerName().trim();
        if (name.isBlank()) throw new RuntimeException("Passenger name is required");
        String phone = request.getPassengerPhone() == null ? null : request.getPassengerPhone().trim();
        return purchaseInternal(request, null, name, phone);
    }

    // ── Legacy book (kept for backward compat) ───────────────────────────────

    @Transactional
    public TicketResponse bookTicket(TicketRequest request) {
        return purchaseTicket(request);
    }

    @Transactional
    public TicketResponse bookTicketPublic(TicketRequest request) {
        return purchaseTicketPublic(request);
    }

    // ── Core purchase logic ──────────────────────────────────────────────────

    private TicketResponse purchaseInternal(TicketRequest request, User user,
                                            String passengerName, String passengerPhone) {
        // 1. Validate route
        Route route = routeRepository.findByIdWithStops(request.getRouteId())
            .orElseThrow(() -> new RuntimeException("Route not found"));
        if (route.getStatus() != Route.RouteStatus.ACTIVE) {
            throw new RuntimeException("This route is not available for purchase");
        }

        // 2. Validate passenger type
        String passengerType = request.getPassengerType();
        if (passengerType == null || passengerType.isBlank()) {
            throw new RuntimeException("Passenger type is required");
        }

        // 3. Server-side fare resolution (never trust client)
        BigDecimal fare = resolveFare(route, passengerType);

        // 4. Validate payment info
        String paymentMethod = request.getPaymentMethod();
        String paymentProvider = request.getPaymentProvider();
        String txRef = request.getTransactionReference();
        if (paymentMethod == null || paymentMethod.isBlank()) throw new RuntimeException("Payment method is required");
        if (paymentProvider == null || paymentProvider.isBlank()) throw new RuntimeException("Payment provider is required");
        if (txRef == null || txRef.isBlank()) throw new RuntimeException("Transaction reference is required");

        // 5. Prevent duplicate transaction reference
        if (ticketRepository.findByTransactionReference(txRef).isPresent()) {
            throw new RuntimeException("A ticket has already been issued for this transaction");
        }

        // 6. Generate IDs
        String ticketNumber = generateTicketNumber();
        String refNumber   = generateReferenceNumber();
        String qrToken     = generateQrToken();

        // 7. Build and save
        Ticket ticket = Ticket.builder()
            .ticketNumber(ticketNumber)
            .referenceNumber(refNumber)
            .qrToken(qrToken)
            .user(user)
            .passengerName(passengerName)
            .passengerPhone(passengerPhone)
            .passengerType(passengerType.toUpperCase())
            .route(route)
            .amount(fare)
            .currency("TZS")
            .paymentMethod(paymentMethod.toUpperCase())
            .paymentProvider(paymentProvider)
            .transactionReference(txRef)
            .paymentStatus(Ticket.PaymentStatus.PAID)
            .status(Ticket.TicketStatus.ACTIVE)
            .travelDate(request.getTravelDate())
            .issuedAt(LocalDateTime.now())
            .build();

        Ticket saved = ticketRepository.save(ticket);

        auditLogService.log("CREATE", "Ticket", saved.getId(),
            "Purchased ticket " + ticketNumber + " for route " + route.getName()
                + " via " + paymentProvider);
        notificationService.notifyAdmins(
            "New Ticket Purchased",
            "Ticket " + ticketNumber + " purchased by " + passengerName
                + " for route \"" + route.getName() + "\" via " + paymentProvider + ".",
            "TICKET"
        );

        return toResponse(saved);
    }

    // ── QR Verification ─────────────────────────────────────────────────────

    @Transactional
    public TicketVerifyResponse verifyTicketByQrToken(String qrToken) {
        var optTicket = ticketRepository.findByQrToken(qrToken);
        if (optTicket.isEmpty()) {
            return TicketVerifyResponse.builder()
                .result("INVALID")
                .message("Invalid Ticket — no ticket matches this QR code")
                .build();
        }

        Ticket ticket = optTicket.get();

        // Check payment
        if (ticket.getPaymentStatus() != Ticket.PaymentStatus.PAID) {
            return TicketVerifyResponse.builder()
                .result("UNPAID")
                .message("Unpaid Ticket — payment not completed")
                .ticketNumber(ticket.getTicketNumber())
                .referenceNumber(ticket.getReferenceNumber())
                .passengerName(ticket.getPassengerName())
                .passengerType(ticket.getPassengerType())
                .routeName(ticket.getRoute().getName())
                .status(ticket.getStatus().name())
                .paymentStatus(ticket.getPaymentStatus().name())
                .build();
        }

        // Check cancelled
        if (ticket.getStatus() == Ticket.TicketStatus.CANCELLED) {
            return TicketVerifyResponse.builder()
                .result("CANCELLED")
                .message("Cancelled Ticket — this ticket has been cancelled")
                .ticketNumber(ticket.getTicketNumber())
                .referenceNumber(ticket.getReferenceNumber())
                .passengerName(ticket.getPassengerName())
                .passengerType(ticket.getPassengerType())
                .routeName(ticket.getRoute().getName())
                .status(ticket.getStatus().name())
                .paymentStatus(ticket.getPaymentStatus().name())
                .build();
        }

        // Check already used
        if (ticket.getStatus() == Ticket.TicketStatus.USED) {
            return TicketVerifyResponse.builder()
                .result("ALREADY_USED")
                .message("Already Used — this ticket was scanned at "
                    + (ticket.getScannedAt() != null
                        ? ticket.getScannedAt().format(DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm"))
                        : "unknown time"))
                .ticketNumber(ticket.getTicketNumber())
                .referenceNumber(ticket.getReferenceNumber())
                .passengerName(ticket.getPassengerName())
                .passengerType(ticket.getPassengerType())
                .routeName(ticket.getRoute().getName())
                .status(ticket.getStatus().name())
                .paymentStatus(ticket.getPaymentStatus().name())
                .scannedAt(ticket.getScannedAt() != null ? ticket.getScannedAt().toString() : null)
                .build();
        }

        // Mark as USED
        ticket.setStatus(Ticket.TicketStatus.USED);
        ticket.setScannedAt(LocalDateTime.now());
        ticketRepository.save(ticket);

        auditLogService.log("UPDATE", "Ticket", ticket.getId(),
            "Ticket " + ticket.getTicketNumber() + " marked as USED via QR scan");

        return TicketVerifyResponse.builder()
            .result("VALID")
            .message("Valid Ticket ✓ — Passenger may board")
            .ticketNumber(ticket.getTicketNumber())
            .referenceNumber(ticket.getReferenceNumber())
            .passengerName(ticket.getPassengerName())
            .passengerType(ticket.getPassengerType())
            .routeName(ticket.getRoute().getName())
            .status("USED")
            .paymentStatus("PAID")
            .scannedAt(ticket.getScannedAt().toString())
            .build();
    }

    // ── Cancel ───────────────────────────────────────────────────────────────

    @Transactional
    public TicketResponse cancelTicket(Long id, String reason) {
        Ticket ticket = ticketRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Ticket not found: " + id));
        User currentUser = authService.getCurrentUser();
        if (currentUser.getRole() != User.Role.ADMIN) {
            throw new RuntimeException("Only administrators can cancel tickets from this page");
        }
        if (ticket.getStatus() == Ticket.TicketStatus.USED) {
            throw new RuntimeException("Used tickets cannot be cancelled");
        }
        if (reason == null || reason.trim().isBlank()) {
            throw new RuntimeException("Cancellation reason is required");
        }
        ticket.setStatus(Ticket.TicketStatus.CANCELLED);
        ticket.setPaymentStatus(Ticket.PaymentStatus.CANCELLED);
        ticket.setCancelledAt(LocalDateTime.now());
        ticket.setCancellationReason(reason.trim());
        ticket.setCancelledBy(currentUser);
        Ticket saved = ticketRepository.save(ticket);
        auditLogService.log("UPDATE", "Ticket", saved.getId(),
            "Cancelled ticket " + saved.getTicketNumber());
        notificationService.notifyAdmins(
            "Ticket Cancelled",
            "Ticket " + saved.getTicketNumber() + " has been cancelled.",
            "TICKET"
        );
        return toResponse(saved);
    }

    private Specification<Ticket> ticketSpecification(String search, LocalDate dateFrom, LocalDate dateTo, Long routeId,
                                                      String passengerType, String paymentMethod, String paymentStatus,
                                                      String ticketStatus) {
        return (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (search != null && !search.trim().isBlank()) {
                String q = "%" + search.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("ticketNumber")), q),
                    cb.like(cb.lower(root.get("referenceNumber")), q),
                    cb.like(cb.lower(root.get("passengerName")), q),
                    cb.like(cb.lower(root.get("passengerPhone")), q),
                    cb.like(cb.lower(root.get("transactionReference")), q),
                    cb.like(cb.lower(root.join("route").get("name")), q)
                ));
            }
            if (dateFrom != null) predicates.add(cb.greaterThanOrEqualTo(root.get("createdAt"), dateFrom.atStartOfDay()));
            if (dateTo != null) predicates.add(cb.lessThanOrEqualTo(root.get("createdAt"), dateTo.atTime(LocalTime.MAX)));
            if (routeId != null) predicates.add(cb.equal(root.get("route").get("id"), routeId));
            if (passengerType != null && !passengerType.isBlank()) predicates.add(cb.equal(cb.upper(root.get("passengerType")), passengerType.toUpperCase()));
            if (paymentMethod != null && !paymentMethod.isBlank()) predicates.add(cb.equal(cb.upper(root.get("paymentMethod")), paymentMethod.toUpperCase()));
            if (paymentStatus != null && !paymentStatus.isBlank()) predicates.add(cb.equal(root.get("paymentStatus"), Ticket.PaymentStatus.valueOf(paymentStatus.toUpperCase())));
            if (ticketStatus != null && !ticketStatus.isBlank()) predicates.add(cb.equal(root.get("status"), Ticket.TicketStatus.valueOf(ticketStatus.toUpperCase().replace(' ', '_'))));
            return cb.and(predicates.toArray(new Predicate[0]));
        };
    }

    private String csv(Object value) {
        String text = value == null ? "" : value.toString();
        return "\"" + text.replace("\"", "\"\"") + "\"";
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private String generateTicketNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String candidate;
        do {
            String randomPart = String.format("%04d", secureRandom.nextInt(10000));
            candidate = "ZNZ-" + datePart + "-" + randomPart;
        } while (ticketRepository.existsByTicketNumber(candidate));
        return candidate;
    }

    private String generateReferenceNumber() {
        String datePart = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String candidate;
        do {
            String randomHex = String.format("%08X", secureRandom.nextInt(Integer.MAX_VALUE));
            candidate = "ZB-" + datePart + "-" + randomHex;
        } while (ticketRepository.existsByReferenceNumber(candidate));
        return candidate;
    }

    private String generateQrToken() {
        byte[] bytes = new byte[32];
        secureRandom.nextBytes(bytes);
        return "ZANBUS-" + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private TicketResponse toResponse(Ticket ticket) {
        return TicketResponse.builder()
            .id(ticket.getId())
            .ticketNumber(ticket.getTicketNumber())
            .referenceNumber(ticket.getReferenceNumber())
            .qrToken(ticket.getQrToken())
            .userId(ticket.getUser() == null ? null : ticket.getUser().getId())
            .passengerName(ticket.getPassengerName())
            .passengerPhone(ticket.getPassengerPhone())
            .passengerType(ticket.getPassengerType())
            .routeId(ticket.getRoute().getId())
            .routeName(ticket.getRoute().getName())
            .fromStopId(ticket.getFromStop() == null ? null : ticket.getFromStop().getId())
            .fromStopName(ticket.getFromStop() == null ? null : ticket.getFromStop().getName())
            .toStopId(ticket.getToStop() == null ? null : ticket.getToStop().getId())
            .toStopName(ticket.getToStop() == null ? null : ticket.getToStop().getName())
            .amount(ticket.getAmount())
            .currency(ticket.getCurrency())
            .paymentMethod(ticket.getPaymentMethod())
            .paymentProvider(ticket.getPaymentProvider())
            .transactionReference(ticket.getTransactionReference())
            .paymentStatus(ticket.getPaymentStatus() == null ? null : ticket.getPaymentStatus().name())
            .status(ticket.getStatus().name())
            .travelDate(ticket.getTravelDate())
            .scannedAt(ticket.getScannedAt())
            .issuedAt(ticket.getIssuedAt())
            .cancelledAt(ticket.getCancelledAt())
            .cancellationReason(ticket.getCancellationReason())
            .cancelledById(ticket.getCancelledBy() == null ? null : ticket.getCancelledBy().getId())
            .cancelledByName(ticket.getCancelledBy() == null ? null : ticket.getCancelledBy().getFullName())
            .createdAt(ticket.getCreatedAt())
            .build();
    }
}
