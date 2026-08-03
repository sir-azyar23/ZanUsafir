package com.zanusafiri.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
@Order(Ordered.HIGHEST_PRECEDENCE)
public class DatabaseConstraintInitializer implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) {
        ensureUserRoleConstraintAllowsTransportOfficer();
    }

    private void ensureUserRoleConstraintAllowsTransportOfficer() {
        try {
            // First migrate roles in data to avoid constraint violations
            jdbcTemplate.execute("UPDATE tickets SET user_id = NULL WHERE user_id IN (SELECT id FROM users WHERE role = 'PASSENGER')");
            jdbcTemplate.execute("DELETE FROM users WHERE role = 'PASSENGER'");
            jdbcTemplate.execute("UPDATE users SET role = 'TRANSPORT_OFFICER' WHERE role = 'STAFF'");

            jdbcTemplate.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check");
            jdbcTemplate.execute("""
                ALTER TABLE users
                ADD CONSTRAINT users_role_check
                CHECK (role IN ('ADMIN', 'TRANSPORT_OFFICER'))
                """);
            log.info("Verified users.role check constraint includes only ADMIN and TRANSPORT_OFFICER");
        } catch (Exception e) {
            log.warn("Could not update users.role check constraint: {}", e.getMessage());
        }
    }
}
