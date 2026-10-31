package com.example.rgsenterprisesbackend.model;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum ExpenseCategory {
    ELECTRICITY,
    INTERNET,
    WATER,
    PROPERTY_TAX,
    MAINTENANCE,
    SECURITY,
    INSURANCE,
    REPAIRS,
    SALARY,
    OTHER;

    @JsonCreator
    public static ExpenseCategory fromString(String value) {
        if (value == null || value.isBlank()) {
            return OTHER;
        }
        String clean = value.trim().toUpperCase().replace("-", "_").replace(" ", "_");
        try {
            return ExpenseCategory.valueOf(clean);
        } catch (IllegalArgumentException e) {
            return OTHER;
        }
    }
}
