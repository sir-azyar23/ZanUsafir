package com.zanusafiri.service;

import com.zanusafiri.dto.DriverRequest;
import com.zanusafiri.dto.DriverResponse;
import com.zanusafiri.entity.Bus;
import com.zanusafiri.entity.Driver;
import com.zanusafiri.repository.BusRepository;
import com.zanusafiri.repository.DriverRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class DriverService {

    private final DriverRepository driverRepository;
    private final BusRepository busRepository;
    private final AuditLogService auditLogService;
    private final NotificationService notificationService;

    @Transactional
    public List<DriverResponse> getAllDrivers() {
        return driverRepository.findAll().stream().map(this::toResponse).collect(Collectors.toList());
    }

    @Transactional
    public DriverResponse getDriverById(Long id) {
        return toResponse(driverRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Driver not found: " + id)));
    }

    @Transactional
    public DriverResponse createDriver(DriverRequest request) {
        if (driverRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new RuntimeException("Driver with license already exists");
        }
        Bus bus = request.getBusId() != null ? busRepository.findById(request.getBusId()).orElse(null) : null;
        Driver driver = Driver.builder()
            .fullName(request.getFullName()).licenseNumber(request.getLicenseNumber())
            .phone(request.getPhone()).email(request.getEmail()).address(request.getAddress())
            .status(Driver.DriverStatus.valueOf(request.getStatus().toUpperCase()))
            .bus(bus).build();
        Driver saved = driverRepository.save(driver);
        auditLogService.log("CREATE", "Driver", saved.getId(), "Created driver: " + saved.getFullName());
        notificationService.notifyAdmins(
            "New Driver Added",
            "Driver " + saved.getFullName() + " (License: " + saved.getLicenseNumber() + ") has been added.",
            "DRIVER"
        );
        return toResponse(saved);
    }

    @Transactional
    public DriverResponse updateDriver(Long id, DriverRequest request) {
        Driver driver = driverRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Driver not found: " + id));
        Bus bus = request.getBusId() != null ? busRepository.findById(request.getBusId()).orElse(null) : null;
        driver.setFullName(request.getFullName()); driver.setLicenseNumber(request.getLicenseNumber());
        driver.setPhone(request.getPhone()); driver.setEmail(request.getEmail());
        driver.setAddress(request.getAddress());
        driver.setStatus(Driver.DriverStatus.valueOf(request.getStatus().toUpperCase()));
        driver.setBus(bus);
        Driver saved = driverRepository.save(driver);
        auditLogService.log("UPDATE", "Driver", saved.getId(), "Updated driver: " + saved.getFullName());
        notificationService.notifyAdmins(
            "Driver Updated",
            "Driver " + saved.getFullName() + "'s information has been updated.",
            "DRIVER"
        );
        return toResponse(saved);
    }

    @Transactional
    public void deleteDriver(Long id) {
        Driver driver = driverRepository.findById(id).orElseThrow(() -> new RuntimeException("Driver not found"));
        driverRepository.delete(driver);
        auditLogService.log("DELETE", "Driver", id, "Deleted driver: " + driver.getFullName());
        notificationService.notifyAdmins(
            "Driver Removed",
            "Driver " + driver.getFullName() + " has been removed from the system.",
            "DRIVER"
        );
    }

    private DriverResponse toResponse(Driver d) {
        return DriverResponse.builder().id(d.getId()).fullName(d.getFullName())
            .licenseNumber(d.getLicenseNumber()).phone(d.getPhone()).email(d.getEmail())
            .address(d.getAddress()).status(d.getStatus().name())
            .busId(d.getBus() != null ? d.getBus().getId() : null)
            .busPlateNumber(d.getBus() != null ? d.getBus().getPlateNumber() : null)
            .createdAt(d.getCreatedAt()).build();
    }
}
