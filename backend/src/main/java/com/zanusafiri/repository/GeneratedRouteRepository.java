package com.zanusafiri.repository;

import com.zanusafiri.entity.GeneratedRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GeneratedRouteRepository extends JpaRepository<GeneratedRoute, Long> {
    List<GeneratedRoute> findByRouteId(Long routeId);
    List<GeneratedRoute> findByStatusIgnoreCase(String status);
}
