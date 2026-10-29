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
        // Admin 1 (Sai Babu P)
        userRepository.findByEmailIgnoreCase("rgsenterprise2026@gmail.com")
                .or(() -> userRepository.findByUsernameIgnoreCase("Sai Babu P"))
                .or(() -> userRepository.findByUsernameIgnoreCase("admin"))
                .ifPresentOrElse(
                        user -> {
                            if (user.isMustChangePassword()) {
                                user.setPasswordHash(passwordEncoder.encode("Admin@1"));
                                user.setUsername("Sai Babu P");
                                user.setEmail("rgsenterprise2026@gmail.com");
                                user.setFullName("Sai Babu P");
                                user.setMustChangePassword(true);
                                userRepository.save(user);
                                log.info("Admin 1 [Sai Babu P] default credentials synced (password change pending).");
                            } else {
                                log.info("Admin 1 [{}] already has personalized password.", user.getUsername());
                            }
                        },
                        () -> {
                            AppUser newAdmin1 = AppUser.builder()
                                    .username("Sai Babu P")
                                    .email("rgsenterprise2026@gmail.com")
                                    .passwordHash(passwordEncoder.encode("Admin@1"))
                                    .fullName("Sai Babu P")
                                    .mustChangePassword(true)
                                    .role(Role.ADMIN)
                                    .build();
                            userRepository.save(newAdmin1);
                            log.info("Initialized Admin 1 [Sai Babu P] with default credentials.");
                        }
                );

        // Admin 2 (B Chandrasekhar)
        userRepository.findByEmailIgnoreCase("bschandrasekhar4@gmail.com")
                .or(() -> userRepository.findByUsernameIgnoreCase("B Chandrasekhar"))
                .or(() -> userRepository.findByUsernameIgnoreCase("admin2"))
                .ifPresentOrElse(
                        user -> {
                            if (user.isMustChangePassword()) {
                                user.setPasswordHash(passwordEncoder.encode("Admin@2"));
                                user.setUsername("B Chandrasekhar");
                                user.setEmail("bschandrasekhar4@gmail.com");
                                user.setFullName("B Chandrasekhar");
                                user.setMustChangePassword(true);
                                userRepository.save(user);
                                log.info("Admin 2 [B Chandrasekhar] default credentials synced (password change pending).");
                            } else {
                                log.info("Admin 2 [{}] already has personalized password.", user.getUsername());
                            }
                        },
                        () -> {
                            AppUser newAdmin2 = AppUser.builder()
                                    .username("B Chandrasekhar")
                                    .email("bschandrasekhar4@gmail.com")
                                    .passwordHash(passwordEncoder.encode("Admin@2"))
                                    .fullName("B Chandrasekhar")
                                    .mustChangePassword(true)
                                    .role(Role.ADMIN)
                                    .build();
                            userRepository.save(newAdmin2);
                            log.info("Initialized Admin 2 [B Chandrasekhar] with default credentials.");
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

