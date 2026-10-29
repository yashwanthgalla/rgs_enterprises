package com.example.rgsenterprisesbackend.dto;

import com.example.rgsenterprisesbackend.model.DocumentType;

import java.time.OffsetDateTime;

public record DocumentResponse(
        Long id,
        Long godownId,
        String godownName,
        String fileName,
        String fileType,
        Long fileSize,
        String storagePath,
        String publicUrl,
        DocumentType documentType,
        String description,
        OffsetDateTime createdAt
) {}

