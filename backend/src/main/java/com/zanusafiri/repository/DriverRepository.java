package com.zanusafiri.repository;

import com.zanusafiri.entity.Driver;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DriverRepository extends JpaRepository<Driver, Long> {
    Optional<Driver> findByLicenseNumber(String licenseNumber);
    boolean existsByLicenseNumber(String licenseNumber);
    List<Driver> findByStatus(Driver.DriverStatus status);
    Optional<Driver> findByBusId(Long busId);
}
