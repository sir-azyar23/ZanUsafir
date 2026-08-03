package com.zanusafiri.repository;

import com.zanusafiri.entity.Fare;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FareRepository extends JpaRepository<Fare, Long> {
    List<Fare> findByRouteId(Long routeId);
    List<Fare> findByFromStopIdOrToStopId(Long fromStopId, Long toStopId);
    Optional<Fare> findByRouteIdAndFromStopIdAndToStopId(Long routeId, Long fromStopId, Long toStopId);
}
