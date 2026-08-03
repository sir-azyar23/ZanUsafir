package com.zanusafiri.repository;

import com.zanusafiri.entity.Bus;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusRepository extends JpaRepository<Bus, Long> {
    @Override
    @EntityGraph(attributePaths = {"route", "driver"})
    List<Bus> findAll();

    @Override
    @EntityGraph(attributePaths = {"route", "driver"})
    Optional<Bus> findById(Long id);

    @EntityGraph(attributePaths = {"route", "driver"})
    List<Bus> findByRouteId(Long routeId);

    List<Bus> findByStatus(Bus.BusStatus status);
    Optional<Bus> findByPlateNumber(String plateNumber);
    boolean existsByPlateNumber(String plateNumber);
}
