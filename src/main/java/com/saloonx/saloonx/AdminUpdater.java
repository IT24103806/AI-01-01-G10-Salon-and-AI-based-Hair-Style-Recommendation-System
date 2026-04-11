package com.saloonx.saloonx;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.jdbc.core.JdbcTemplate;
import lombok.RequiredArgsConstructor;

@Component
@RequiredArgsConstructor
public class AdminUpdater implements CommandLineRunner {
    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        int updated = jdbcTemplate.update("UPDATE users SET role = 'ADMIN'");
        System.out.println("=========================================");
        System.out.println("SUCCESSFULLY UPGRADED " + updated + " USERS TO ADMIN!");
        System.out.println("=========================================");
        System.exit(0);
    }
}
