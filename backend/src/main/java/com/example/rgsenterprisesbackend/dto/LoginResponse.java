package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.Role;

public record LoginResponse(
        String token,
        String tokenType,
        long expiresIn,
        UserResponse user
) {}

