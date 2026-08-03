package com.zanusafiri.config;

import com.zanusafiri.entity.*;
import com.zanusafiri.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;


@Slf4j
@Component
@RequiredArgsConstructor
@SuppressWarnings("null")
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final RouteRepository routeRepository;
    private final BusStopRepository busStopRepository;
    private final RouteStopRepository routeStopRepository;
    private final BusRepository busRepository;
    private final DriverRepository driverRepository;
    private final FareRepository fareRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        log.info("Seeding database with initial data...");

        // ── Users ─────────────────────────────────────────────────
        if (userRepository.count() == 0) {
            userRepository.save(User.builder()
                .username("admin")
                .email("admin@zanusafiri.tz")
                .password(passwordEncoder.encode("admin123"))
                .fullName("System Administrator")
                .role(User.Role.ADMIN)
                .active(true)
                .build());

            userRepository.save(User.builder()
                .username("officer")
                .email("officer@zanusafiri.tz")
                .password(passwordEncoder.encode("officer123"))
                .fullName("Transport Officer")
                .role(User.Role.TRANSPORT_OFFICER)
                .active(true)
                .mustChangePassword(true)
                .temporaryPasswordExpiresAt(LocalDateTime.now().plusHours(24))
                .build());

            log.info("Created default users: admin (admin123), officer (officer123)");
        } else {
            log.info("User table already has data. Skipping default user seeding so deleted users stay deleted.");
        }

        boolean seedOperationalDemoData = false;
        if (!seedOperationalDemoData) {
            log.info("Operational demo data seeding is disabled. Existing routes, stops, buses, drivers, and fares will not be recreated after deletion.");
            return;
        }

        // ── Bus Stops (real Zanzibar locations) ───────────────────
        BusStop stoneTown = ensureBusStop("Stone Town Terminal", "Creek Road, Stone Town", -6.1630, 39.1916);
        BusStop darajani = ensureBusStop("Darajani Market", "Darajani, Stone Town", -6.1600, 39.1940);
        BusStop bububu = ensureBusStop("Bububu Junction", "Bububu, North Zanzibar", -6.1100, 39.2100);
        ensureBusStop("Mkokotoni Ferry", "Mkokotoni, North Zanzibar", -5.8819, 39.2637);
        BusStop airport = ensureBusStop("Zanzibar Airport", "Kiembi Samaki, Unguja", -6.2195, 39.2249);
        BusStop kendwa = ensureBusStop("Kendwa Beach", "Kendwa, North West Zanzibar", -5.7652, 39.2215);
        BusStop nungwi = ensureBusStop("Nungwi Village", "Nungwi, North Zanzibar", -5.7226, 39.2975);
        BusStop paje = ensureBusStop("Paje Beach", "Paje, East Zanzibar", -6.2677, 39.5344);

        log.info("Created {} bus stops", busStopRepository.count());

        // ── Routes ────────────────────────────────────────────────
        Route route1 = ensureRoute("Stone Town — Nungwi Express",
            "Main tourist route from Stone Town to Nungwi beach via Bububu",
            stoneTown, nungwi);

        Route route2 = ensureRoute("Stone Town — Airport Shuttle",
            "Direct airport transfer service from Stone Town terminal",
            stoneTown, airport);

        Route route3 = ensureRoute("Stone Town — Paje Beach",
            "East coast route to Paje kite beach",
            stoneTown, paje);

        // ── Route Stops ───────────────────────────────────────────
        ensureRouteStops(route1, List.of(stoneTown, darajani, bububu, kendwa, nungwi));
        ensureRouteStops(route2, List.of(stoneTown, darajani, airport));
        ensureRouteStops(route3, List.of(stoneTown, darajani, paje));

        log.info("Created {} routes with stops", routeRepository.count());

        // ── Buses ─────────────────────────────────────────────────
        if (busRepository.count() == 0) {
            Bus bus1 = busRepository.save(Bus.builder()
                .plateNumber("ZNZ-001A").capacity(30).model("Toyota Coaster")
                .color("Yellow & Blue").status(Bus.BusStatus.ACTIVE).route(route1).build());

            Bus bus2 = busRepository.save(Bus.builder()
                .plateNumber("ZNZ-002B").capacity(45).model("Isuzu NQR")
                .color("White & Blue").status(Bus.BusStatus.ACTIVE).route(route1).build());

            Bus bus3 = busRepository.save(Bus.builder()
                .plateNumber("ZNZ-003C").capacity(20).model("Toyota HiAce")
                .color("White").status(Bus.BusStatus.ACTIVE).route(route2).build());

            busRepository.save(Bus.builder()
                .plateNumber("ZNZ-004D").capacity(35).model("Nissan Civilian")
                .color("Green & White").status(Bus.BusStatus.MAINTENANCE).route(route3).build());

            seedDrivers(bus1, bus2, bus3);
        }

        log.info("Created {} buses", busRepository.count());
        log.info("Created {} drivers", driverRepository.count());

        // ── Fares ─────────────────────────────────────────────────
        if (fareRepository.count() == 0) {
            fareRepository.save(Fare.builder().route(route1).fromStop(stoneTown).toStop(nungwi).amount(new BigDecimal("2000")).currency("TZS").build());
            fareRepository.save(Fare.builder().route(route1).fromStop(stoneTown).toStop(bububu).amount(new BigDecimal("800")).currency("TZS").build());
            fareRepository.save(Fare.builder().route(route1).fromStop(bububu).toStop(nungwi).amount(new BigDecimal("1200")).currency("TZS").build());
            fareRepository.save(Fare.builder().route(route2).fromStop(stoneTown).toStop(airport).amount(new BigDecimal("5000")).currency("TZS").build());
            fareRepository.save(Fare.builder().route(route3).fromStop(stoneTown).toStop(paje).amount(new BigDecimal("3000")).currency("TZS").build());
        }

        log.info("Created {} fares", fareRepository.count());
        log.info("✅ Database seeding complete!");
        log.info("Login with: admin / admin123  OR  officer / officer123");
    }

    private BusStop ensureBusStop(String name, String address, Double latitude, Double longitude) {
        return busStopRepository.findByNameIgnoreCase(name)
            .orElseGet(() -> busStopRepository.save(BusStop.builder()
                .name(name)
                .address(address)
                .latitude(latitude)
                .longitude(longitude)
                .status(BusStop.StopStatus.ACTIVE)
                .build()));
    }

    private Route ensureRoute(String name, String description, BusStop start, BusStop end) {
        return routeRepository.findByNameIgnoreCase(name)
            .orElseGet(() -> routeRepository.save(Route.builder()
                .name(name)
                .description(description)
                .startPoint(start.getName())
                .endPoint(end.getName())
                .startLat(start.getLatitude())
                .startLng(start.getLongitude())
                .endLat(end.getLatitude())
                .endLng(end.getLongitude())
                .status(Route.RouteStatus.ACTIVE)
                .build()));
    }

    private void ensureRouteStops(Route route, List<BusStop> stops) {
        if (routeStopRepository.findByRouteIdOrderByStopOrder(route.getId()).isEmpty()) {
            for (int i = 0; i < stops.size(); i++) {
                routeStopRepository.save(RouteStop.builder()
                    .route(route)
                    .busStop(stops.get(i))
                    .stopOrder(i + 1)
                    .build());
            }
        }
    }

    private void seedDrivers(Bus bus1, Bus bus2, Bus bus3) {
        driverRepository.save(Driver.builder()
            .fullName("Ali Hassan Mwinyi").licenseNumber("ZNZ-DL-001")
            .phone("+255 777 100001").email("ali.hassan@zanusafiri.tz")
            .address("Stone Town, Zanzibar")
            .status(Driver.DriverStatus.ACTIVE).bus(bus1).build());

        driverRepository.save(Driver.builder()
            .fullName("Fatuma Amour Said").licenseNumber("ZNZ-DL-002")
            .phone("+255 777 100002").email("fatuma.said@zanusafiri.tz")
            .address("Bububu, Zanzibar")
            .status(Driver.DriverStatus.ACTIVE).bus(bus2).build());

        driverRepository.save(Driver.builder()
            .fullName("Mohammed Saleh Juma").licenseNumber("ZNZ-DL-003")
            .phone("+255 777 100003").email("mohammed.juma@zanusafiri.tz")
            .address("Nungwi, Zanzibar")
            .status(Driver.DriverStatus.ACTIVE).bus(bus3).build());

        driverRepository.save(Driver.builder()
            .fullName("Zuwena Omar Khamis").licenseNumber("ZNZ-DL-004")
            .phone("+255 777 100004")
            .address("Paje, Zanzibar")
            .status(Driver.DriverStatus.ON_LEAVE).build());
    }
}
