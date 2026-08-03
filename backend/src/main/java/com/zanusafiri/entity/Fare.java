package com.zanusafiri.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "fares")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Fare {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "from_stop_id", nullable = false)
    private BusStop fromStop;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "to_stop_id", nullable = false)
    private BusStop toStop;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column
    @Builder.Default
    private String status = "ACTIVE";

    @Column(nullable = false)
    @Builder.Default
    private String currency = "TZS";

    @Column(updatable = false)
    private LocalDateTime createdAt;

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
}
