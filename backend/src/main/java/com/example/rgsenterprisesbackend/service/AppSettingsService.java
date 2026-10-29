package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.AppSettingsRequest;
import com.example.rgsenterprisesbackend.dto.AppSettingsResponse;
import com.example.rgsenterprisesbackend.model.AppSettings;
import com.example.rgsenterprisesbackend.repository.AppSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AppSettingsService {

    private final AppSettingsRepository appSettingsRepository;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public AppSettingsResponse getSettings() {
        AppSettings settings = appSettingsRepository.findFirstByOrderByIdAsc()
                .orElseGet(() -> AppSettings.builder()
                        .companyName("RGS Enterprises Godown Portfolio")
                        .logoUrl("")
                        .currencySymbol("₹")
                        .contactEmail("admin@rgsenterprises.com")
                        .contactPhone("+91 98490 12345")
                        .build());
        return mapToResponse(settings);
    }

    @Transactional
    public AppSettingsResponse updateSettings(AppSettingsRequest request) {
        AppSettings settings = appSettingsRepository.findFirstByOrderByIdAsc()
                .orElse(AppSettings.builder().build());

        settings.setCompanyName(request.companyName());
        settings.setLogoUrl(request.logoUrl());
        settings.setCurrencySymbol(request.currencySymbol());
        settings.setContactEmail(request.contactEmail());
        settings.setContactPhone(request.contactPhone());

        AppSettings saved = appSettingsRepository.save(settings);
        activityLogService.logActivity("SETTINGS", saved.getId(), "UPDATE", "Updated organization branding and portfolio settings");
        return mapToResponse(saved);
    }

    private AppSettingsResponse mapToResponse(AppSettings s) {
        return new AppSettingsResponse(
                s.getId(),
                s.getCompanyName(),
                s.getLogoUrl(),
                s.getCurrencySymbol(),
                s.getContactEmail(),
                s.getContactPhone(),
                s.getUpdatedAt()
        );
    }
}

