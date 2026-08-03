package com.zanusafiri.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "bus_stops")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BusStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "stop_code")
    private String stopCode;

    private String address;

    @Column(nullable = false)
    private Double latitude;

    @Column(nullable = false)
    private Double longitude;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private StopStatus status;

    @OneToMany(mappedBy = "busStop", cascade = CascadeType.ALL)
    @Builder.Default
    private List<RouteStop> routeStops = new ArrayList<>();

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = StopStatus.ACTIVE;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum StopStatus {
        ACTIVE, INACTIVE
    }
}
