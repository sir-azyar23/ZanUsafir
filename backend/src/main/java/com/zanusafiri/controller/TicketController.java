package com.zanusafiri.controller;

import com.zanusafiri.dto.TicketRequest;
import com.zanusafiri.dto.TicketResponse;
import com.zanusafiri.dto.TicketVerifyResponse;
import com.zanusafiri.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @GetMapping("/mine")
    public ResponseEntity<List<TicketResponse>> getMyTickets() {
        return ResponseEntity.ok(ticketService.getMyTickets());
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Page<TicketResponse>> getAllTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) String passengerType,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String ticketStatus,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ticketService.searchAdminTickets(search, dateFrom, dateTo, routeId,
            passengerType, paymentMethod, paymentStatus, ticketStatus, pageable));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getTicketSalesSummary() {
        return ResponseEntity.ok(ticketService.getTicketSalesSummary());
    }

    @GetMapping("/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> exportTickets(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) LocalDate dateFrom,
            @RequestParam(required = false) LocalDate dateTo,
            @RequestParam(required = false) Long routeId,
            @RequestParam(required = false) String passengerType,
            @RequestParam(required = false) String paymentMethod,
            @RequestParam(required = false) String paymentStatus,
            @RequestParam(required = false) String ticketStatus) {
        String csv = ticketService.exportAdminTicketsCsv(search, dateFrom, dateTo, routeId,
            passengerType, paymentMethod, paymentStatus, ticketStatus);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=ticket-sales-report.csv")
            .contentType(MediaType.parseMediaType("text/csv"))
            .body(csv);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicket(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    /** Authenticated purchase */
    @PostMapping
    public ResponseEntity<TicketResponse> purchaseTicket(@RequestBody @Valid TicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.purchaseTicket(request));
    }

    /** Public purchase (no login required) */
    @PostMapping("/public")
    public ResponseEntity<TicketResponse> purchaseTicketPublic(@RequestBody @Valid TicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.purchaseTicketPublic(request));
    }

    /** Get server-side fare for route + passenger type */
    @GetMapping("/fare")
    public ResponseEntity<Map<String, Object>> getFare(
            @RequestParam Long routeId,
            @RequestParam String passengerType) {
        BigDecimal fare = ticketService.getFareForRoute(routeId, passengerType);
        return ResponseEntity.ok(Map.of(
            "routeId", routeId,
            "passengerType", passengerType.toUpperCase(),
            "amount", fare,
            "currency", "TZS"
        ));
    }

    /** QR verification endpoint — used by conductor scanner */
    @PostMapping("/verify")
    public ResponseEntity<TicketVerifyResponse> verifyTicket(@RequestBody Map<String, String> body) {
        String qrToken = body.get("qrToken");
        if (qrToken == null || qrToken.isBlank()) {
            return ResponseEntity.badRequest().body(
                TicketVerifyResponse.builder()
                    .result("INVALID")
                    .message("QR token is required")
                    .build()
            );
        }
        return ResponseEntity.ok(ticketService.verifyTicketByQrToken(qrToken));
    }

    @PatchMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TicketResponse> cancelTicket(@PathVariable Long id, @RequestBody Map<String, String> body) {
        return ResponseEntity.ok(ticketService.cancelTicket(id, body.get("reason")));
    }
}
