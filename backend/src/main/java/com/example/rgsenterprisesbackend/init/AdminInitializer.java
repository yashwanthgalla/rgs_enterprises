package com.example.rgsenterprisesbackend.init;

import com.example.rgsenterprisesbackend.model.AppUser;
import com.example.rgsenterprisesbackend.model.Role;
import com.example.rgsenterprisesbackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class AdminInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final com.example.rgsenterprisesbackend.repository.GodownRepository godownRepository;
    private final com.example.rgsenterprisesbackend.service.GodownService godownService;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.password:Admin@12345}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        // Admin 1 (Primary)
        userRepository.findByUsername(adminUsername).ifPresentOrElse(
                user -> {
                    user.setPasswordHash(passwordEncoder.encode(adminPassword));
                    userRepository.save(user);
                    log.info("Admin user [{}] credentials verified and synchronized.", adminUsername);
                },
                () -> {
                    AppUser newAdmin = AppUser.builder()
                            .username(adminUsername)
                            .passwordHash(passwordEncoder.encode(adminPassword))
                            .fullName("Primary Administrator")
                            .role(Role.ADMIN)
                            .build();
                    userRepository.save(newAdmin);
                    log.info("Initialized new Admin user [{}] from configuration.", adminUsername);
                }
        );

        // Admin 2 (Co-Administrator)
        userRepository.findByUsername("admin2").ifPresentOrElse(
                user -> {
                    user.setPasswordHash(passwordEncoder.encode(adminPassword));
                    userRepository.save(user);
                    log.info("Secondary Admin [admin2] verified.");
                },
                () -> {
                    AppUser newAdmin2 = AppUser.builder()
                            .username("admin2")
                            .passwordHash(passwordEncoder.encode(adminPassword))
                            .fullName("Co-Administrator")
                            .role(Role.ADMIN)
                            .build();
                    userRepository.save(newAdmin2);
                    log.info("Initialized secondary Admin user [admin2].");
                }
        );

        // Ensure all active godowns with monthly rent have an active rent roll entry
        try {
            godownRepository.findByIsDeletedFalse().forEach(g -> {
                if (g.getStatus() == com.example.rgsenterprisesbackend.model.GodownStatus.ACTIVE
                        && g.getMonthlyRent() != null
                        && g.getMonthlyRent().compareTo(java.math.BigDecimal.ZERO) > 0) {
                    godownService.createInitialRentEntry(g);
                }
            });
            log.info("Synchronized active godown rent cycles into rent roll.");
        } catch (Exception e) {
            log.warn("Notice: rent cycle sync skipped on init: {}", e.getMessage());
        }
    }
}

