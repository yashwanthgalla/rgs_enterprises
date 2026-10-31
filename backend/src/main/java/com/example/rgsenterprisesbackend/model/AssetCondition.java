package com.example.rgsenterprisesbackend.model;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum AssetCondition {
    EXCELLENT,
    GOOD,
    FAIR,
    POOR,
    DAMAGED;

    @JsonCreator
    public static AssetCondition fromString(String value) {
        if (value == null || value.isBlank()) {
            return GOOD;
        }
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        if (clean.equals("OPERATIONAL")) return GOOD;
        if (clean.equals("NEEDS_REPAIR")) return POOR;
        if (clean.equals("DECOMMISSIONED")) return DAMAGED;
        try {
            return AssetCondition.valueOf(clean);
        } catch (IllegalArgumentException e) {
            return GOOD;
        }
    }
}
