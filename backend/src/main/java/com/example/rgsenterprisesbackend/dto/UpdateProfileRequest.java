package com.example.rgsenterprisesbackend.dto;

public record UpdateProfileRequest(
        String username,
        String newUsername,
        String email,
        String newEmail,
        String fullName,
        String newFullName,
        String currentPassword,
        String newPassword
) {
    public String getEffectiveUsername() {
        if (newUsername != null && !newUsername.isBlank()) return newUsername.trim();
        if (username != null && !username.isBlank()) return username.trim();
        return null;
    }

    public String getEffectiveEmail() {
        if (newEmail != null && !newEmail.isBlank()) return newEmail.trim();
        if (email != null && !email.isBlank()) return email.trim();
        return null;
    }

    public String getEffectiveFullName() {
        if (newFullName != null && !newFullName.isBlank()) return newFullName.trim();
        if (fullName != null && !fullName.isBlank()) return fullName.trim();
        return null;
    }
}
