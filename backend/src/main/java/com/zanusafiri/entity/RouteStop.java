package com.zanusafiri.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "route_stops")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RouteStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "route_id", nullable = false)
    private Route route;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "stop_id", nullable = false)
    private BusStop busStop;

    @Column(nullable = false)
    private Integer stopOrder;

    @Column(name = "map_x")
    private Double mapX;

    @Column(name = "map_y")
    private Double mapY;
}
