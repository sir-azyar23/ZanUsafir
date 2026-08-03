package com.zanusafiri.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "buses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class Bus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Long id;

    @Column(unique = true, nullable = false)
    private String plateNumber;

    @Column(name = "bus_number")
    private String busNumber;

    @Column(nullable = false)
    private Integer capacity;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private BusStatus status;

    private String model;
    private String color;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id")
    private Route route;

    @OneToOne(mappedBy = "bus", cascade = CascadeType.ALL)
    private Driver driver;

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = BusStatus.ACTIVE;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum BusStatus {
        ACTIVE, INACTIVE, MAINTENANCE
    }
}
