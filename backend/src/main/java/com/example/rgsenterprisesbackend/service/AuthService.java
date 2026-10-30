package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.config.JwtService;
import com.example.rgsenterprisesbackend.dto.LoginRequest;
import com.example.rgsenterprisesbackend.dto.LoginResponse;
import com.example.rgsenterprisesbackend.dto.UpdateProfileRequest;
import com.example.rgsenterprisesbackend.dto.UserResponse;
import com.example.rgsenterprisesbackend.exception.BadRequestException;
import com.example.rgsenterprisesbackend.exception.ResourceNotFoundException;
import com.example.rgsenterprisesbackend.model.AppUser;
import com.example.rgsenterprisesbackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final AuthenticationManager authenticationManager;
    private final UserDetailsService userDetailsService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final ActivityLogService activityLogService;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String identifier = request.username().trim();
        AppUser user = userRepository.findByUsernameOrEmailIgnoreCase(identifier)
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Invalid username or password"));

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(user.getUsername(), request.password())
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(user.getUsername());

        String token = jwtService.generateToken(userDetails, Map.of(
                "role", user.getRole().name(),
                "fullName", user.getFullName()
        ));

        activityLogService.logActivity("AUTH", user.getId(), "LOGIN", "User " + user.getUsername() + " logged in successfully");

        UserResponse userResponse = new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isMustChangePassword(),
                user.getCreatedAt()
        );

        return new LoginResponse(token, "Bearer", jwtService.getExpirationMs(), user.isMustChangePassword(), userResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        AppUser user = userRepository.findByUsernameOrEmailIgnoreCase(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.isMustChangePassword(),
                user.getCreatedAt()
        );
    }

    @Transactional
    public LoginResponse updateProfile(String currentUsername, UpdateProfileRequest request) {
        AppUser user = userRepository.findByUsernameOrEmailIgnoreCase(currentUsername)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + currentUsername));

        // 1. Password update logic
        if (request.newPassword() != null && !request.newPassword().isBlank()) {
            if (request.newPassword().length() < 6) {
                throw new BadRequestException("New password must be at least 6 characters");
            }
            // If user already changed password in the past, require currentPassword validation
            if (!user.isMustChangePassword()) {
                if (request.currentPassword() == null || !passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
                    throw new BadRequestException("Current password does not match");
                }
            }
            user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
            user.setMustChangePassword(false);
        }

        // 2. Username update logic
        String targetUsername = request.getEffectiveUsername();
        if (targetUsername != null && !targetUsername.isBlank()) {
            if (!targetUsername.equalsIgnoreCase(user.getUsername())) {
                if (userRepository.existsByUsernameIgnoreCaseAndIdNot(targetUsername, user.getId())) {
                    throw new BadRequestException("Username '" + targetUsername + "' is already in use");
                }
                user.setUsername(targetUsername);
            }
        }

        // 3. Email update logic
        String targetEmail = request.getEffectiveEmail();
        if (targetEmail != null && !targetEmail.isBlank()) {
            if (user.getEmail() == null || !targetEmail.equalsIgnoreCase(user.getEmail())) {
                if (userRepository.existsByEmailIgnoreCaseAndIdNot(targetEmail, user.getId())) {
                    throw new BadRequestException("Email '" + targetEmail + "' is already in use");
                }
                user.setEmail(targetEmail);
            }
        }

        // 4. Full name update logic
        String targetFullName = request.getEffectiveFullName();
        if (targetFullName != null && !targetFullName.isBlank()) {
            user.setFullName(targetFullName);
        }

        AppUser saved = userRepository.save(user);
        activityLogService.logActivity("AUTH", saved.getId(), "PROFILE_UPDATED",
                "User " + saved.getUsername() + " updated profile & credentials");

        UserDetails userDetails = userDetailsService.loadUserByUsername(saved.getUsername());
        String token = jwtService.generateToken(userDetails, Map.of(
                "role", saved.getRole().name(),
                "fullName", saved.getFullName()
        ));

        UserResponse userResponse = new UserResponse(
                saved.getId(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getFullName(),
                saved.getRole(),
                saved.isMustChangePassword(),
                saved.getCreatedAt()
        );

        return new LoginResponse(token, "Bearer", jwtService.getExpirationMs(), saved.isMustChangePassword(), userResponse);
    }
}

