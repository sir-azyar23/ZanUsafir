package com.zanusafiri.repository;

import com.zanusafiri.entity.BusStop;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BusStopRepository extends JpaRepository<BusStop, Long> {
    List<BusStop> findByStatus(BusStop.StopStatus status);

    Optional<BusStop> findByNameIgnoreCase(String name);

    @Query("SELECT b FROM BusStop b WHERE LOWER(b.name) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<BusStop> searchByName(String keyword);
}
