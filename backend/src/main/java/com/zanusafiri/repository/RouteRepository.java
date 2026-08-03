package com.zanusafiri.repository;

import com.zanusafiri.entity.Route;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RouteRepository extends JpaRepository<Route, Long> {
    List<Route> findByStatus(Route.RouteStatus status);

    Optional<Route> findByNameIgnoreCase(String name);

    @Query("""
        SELECT DISTINCT r FROM Route r
        LEFT JOIN FETCH r.routeStops rs
        LEFT JOIN FETCH rs.busStop
        LEFT JOIN FETCH r.buses
        """)
    List<Route> findAllWithStops();

    @Query("""
        SELECT r FROM Route r
        LEFT JOIN FETCH r.routeStops rs
        LEFT JOIN FETCH rs.busStop
        LEFT JOIN FETCH r.buses
        WHERE r.id = :id
        """)
    Optional<Route> findByIdWithStops(Long id);

    @Query("""
        SELECT DISTINCT r FROM Route r
        LEFT JOIN FETCH r.routeStops rs
        LEFT JOIN FETCH rs.busStop
        LEFT JOIN FETCH r.buses
        WHERE LOWER(r.name) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(r.routeNumber, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(r.startPoint, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(r.endPoint, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
           OR LOWER(COALESCE(r.description, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
        """)
    List<Route> search(String keyword);
}
