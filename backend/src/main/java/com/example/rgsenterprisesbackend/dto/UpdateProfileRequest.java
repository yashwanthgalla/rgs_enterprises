package com.example.rgsenterprisesbackend.dto;

public record UpdateProfileRequest(
        String username,
        String email,
        String fullName,
        String currentPassword,
        String newPassword
) {}
