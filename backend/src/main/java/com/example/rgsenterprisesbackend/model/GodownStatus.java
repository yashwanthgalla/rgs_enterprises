package com.example.rgsenterprisesbackend.model;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum GodownStatus {
    ACTIVE,
    UNDER_MAINTENANCE,
    VACANT;

    @JsonCreator
    public static GodownStatus fromString(String value) {
        if (value == null || value.isBlank()) {
            return ACTIVE;
        }
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        if (clean.equals("MAINTENANCE") || clean.equals("UNDER_MAINTENANCE")) {
            return UNDER_MAINTENANCE;
        }
        if (clean.equals("INACTIVE") || clean.equals("VACANT")) {
            return VACANT;
        }
        try {
            return GodownStatus.valueOf(clean);
        } catch (IllegalArgumentException e) {
            return ACTIVE;
        }
    }
}
