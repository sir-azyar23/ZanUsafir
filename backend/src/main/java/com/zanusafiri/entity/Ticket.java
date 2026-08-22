package com.zanusafiri.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "tickets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Unique human-readable reference shown on the receipt */
    @Column(name = "ticket_number", nullable = false, unique = true)
    private String ticketNumber;

    /** Unique reference for QR code / conductor scanning */
    @Column(name = "reference_number", nullable = false, unique = true)
    private String referenceNumber;

    /** Secure token embedded in QR code for verification */
    @Column(name = "qr_token", nullable = false, unique = true)
    private String qrToken;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "passenger_name", nullable = false)
    private String passengerName;

    @Column(name = "passenger_phone")
    private String passengerPhone;

    /** STUDENT | ADULT | SENIOR */
    @Column(name = "passenger_type")
    private String passengerType;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "from_stop_id")
    private BusStop fromStop;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "to_stop_id")
    private BusStop toStop;

    /** Fare snapshot at time of purchase */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false)
    @Builder.Default
    private String currency = "TZS";

    /** MOBILE_MONEY | BANK_CARD */
    @Column(name = "payment_method")
    private String paymentMethod;

    /** M-Pesa, Airtel Money, Tigo Pesa, HaloPesa, Visa, Mastercard */
    @Column(name = "payment_provider")
    private String paymentProvider;

    /** Transaction ID returned by payment provider */
    @Column(name = "transaction_reference")
    private String transactionReference;

    /** PENDING | PAID | FAILED | CANCELLED */
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_status", nullable = false)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    /** ACTIVE | USED | CANCELLED */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    @Builder.Default
    private TicketStatus status = TicketStatus.ACTIVE;

    @Column(name = "travel_date")
    private LocalDateTime travelDate;

    @Column(name = "scanned_at")
    private LocalDateTime scannedAt;

    @Column(name = "issued_at")
    private LocalDateTime issuedAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cancelled_by_id")
    private User cancelledBy;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum TicketStatus {
        ACTIVE, USED, CANCELLED, NOT_ISSUED, EXPIRED,
        /** Legacy value – kept for backward compatibility */
        BOOKED
    }

    public enum PaymentStatus {
        PENDING, PAID, FAILED, CANCELLED, REFUNDED, DEMO_PAID, SIMULATED
    }
}
