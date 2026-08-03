package com.zanusafiri.controller;

import com.zanusafiri.dto.TicketRequest;
import com.zanusafiri.dto.TicketResponse;
import com.zanusafiri.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

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
    public ResponseEntity<List<TicketResponse>> getAllTickets() {
        return ResponseEntity.ok(ticketService.getAllTickets());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TicketResponse> getTicket(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.getTicketById(id));
    }

    @PostMapping
    public ResponseEntity<TicketResponse> bookTicket(@RequestBody @Valid TicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.bookTicket(request));
    }

    @PostMapping("/public")
    public ResponseEntity<TicketResponse> bookTicketPublic(@RequestBody @Valid TicketRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ticketService.bookTicketPublic(request));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<TicketResponse> cancelTicket(@PathVariable Long id) {
        return ResponseEntity.ok(ticketService.cancelTicket(id));
    }
}
