package com.zanusafiri.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "routes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Route {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(name = "route_number")
    private String routeNumber;

    private String description;

    @Column(name = "start_point")
    private String startPoint;

    @Column(name = "end_point")
    private String endPoint;

    @Column(name = "start_lat")
    private Double startLat;

    @Column(name = "start_lng")
    private Double startLng;

    @Column(name = "end_lat")
    private Double endLat;

    @Column(name = "end_lng")
    private Double endLng;

    private String distance;

    private String duration;

    @Column(name = "encoded_polyline", columnDefinition = "TEXT")
    private String encodedPolyline;

    @Column(name = "route_geojson", columnDefinition = "TEXT")
    private String routeGeojson;

    @Column(name = "student_fare", precision = 10, scale = 2)
    private BigDecimal studentFare;

    @Column(name = "adult_fare", precision = 10, scale = 2)
    private BigDecimal adultFare;

    @Column(name = "senior_fare", precision = 10, scale = 2)
    private BigDecimal seniorFare;

    @Column(name = "assigned_buses_count")
    private Integer assignedBusesCount;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private RouteStatus status;

    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("stopOrder ASC")
    @Builder.Default
    private List<RouteStop> routeStops = new ArrayList<>();

    @OneToMany(mappedBy = "route", cascade = CascadeType.ALL)
    @Builder.Default
    private Set<Bus> buses = new HashSet<>();

    @Column(updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (status == null) status = RouteStatus.ACTIVE;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum RouteStatus {
        ACTIVE, INACTIVE, SUSPENDED
    }
}
