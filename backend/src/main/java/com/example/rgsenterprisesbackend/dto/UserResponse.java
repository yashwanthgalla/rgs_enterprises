package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.Role;

import java.time.OffsetDateTime;

public record UserResponse(
        Long id,
        String username,
        String fullName,
        Role role,
        OffsetDateTime createdAt
) {}

