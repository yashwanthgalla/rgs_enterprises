package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.config.JwtService;
import com.example.rgsenterprisesbackend.dto.LoginRequest;
import com.example.rgsenterprisesbackend.dto.LoginResponse;
import com.example.rgsenterprisesbackend.dto.UserResponse;
import com.example.rgsenterprisesbackend.exception.ResourceNotFoundException;
import com.example.rgsenterprisesbackend.model.AppUser;
import com.example.rgsenterprisesbackend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
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
    private final ActivityLogService activityLogService;

    @Transactional
    public LoginResponse login(LoginRequest request) {
        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.username(), request.password())
        );

        UserDetails userDetails = userDetailsService.loadUserByUsername(request.username());
        AppUser user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + request.username()));

        String token = jwtService.generateToken(userDetails, Map.of(
                "role", user.getRole().name(),
                "fullName", user.getFullName()
        ));

        activityLogService.logActivity("AUTH", user.getId(), "LOGIN", "User " + user.getUsername() + " logged in successfully");

        UserResponse userResponse = new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole(),
                user.getCreatedAt()
        );

        return new LoginResponse(token, "Bearer", jwtService.getExpirationMs(), userResponse);
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(String username) {
        AppUser user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + username));
        return new UserResponse(
                user.getId(),
                user.getUsername(),
                user.getFullName(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}

