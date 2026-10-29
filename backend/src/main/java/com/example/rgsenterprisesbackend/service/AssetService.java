package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.AssetRequest;
import com.example.rgsenterprisesbackend.dto.AssetResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.exception.ResourceNotFoundException;
import com.example.rgsenterprisesbackend.model.Asset;
import com.example.rgsenterprisesbackend.model.AssetCondition;
import com.example.rgsenterprisesbackend.model.Godown;
import com.example.rgsenterprisesbackend.repository.AssetRepository;
import com.example.rgsenterprisesbackend.repository.GodownRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AssetService {

    private final AssetRepository assetRepository;
    private final GodownRepository godownRepository;
    private final ActivityLogService activityLogService;

    @Transactional(readOnly = true)
    public PagedResponse<AssetResponse> getAssets(Long godownId, AssetCondition condition, String category, String query, Pageable pageable) {
        String categoryFilter = (category != null && !category.isBlank()) ? category.trim().toLowerCase() : null;
        String queryFilter = (query != null && !query.isBlank()) ? "%" + query.trim().toLowerCase() + "%" : null;
        Page<Asset> page = assetRepository.findWithFilters(godownId, condition, categoryFilter, queryFilter, pageable);
        return PagedResponse.from(page.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public List<AssetResponse> getAssetsByGodown(Long godownId) {
        return assetRepository.findByGodownIdAndIsDeletedFalse(godownId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public AssetResponse getAssetById(Long id) {
        Asset asset = assetRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found with ID: " + id));
        return mapToResponse(asset);
    }

    @Transactional
    public AssetResponse createAsset(AssetRequest request) {
        Godown godown = godownRepository.findByIdAndIsDeletedFalse(request.godownId())
                .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + request.godownId()));

        Asset asset = Asset.builder()
                .godown(godown)
                .name(request.name())
                .category(request.category())
                .serialNumber(request.serialNumber())
                .quantity(request.quantity())
                .cost(request.cost())
                .condition(request.condition())
                .purchaseDate(request.purchaseDate())
                .warrantyExpiryDate(request.warrantyExpiryDate())
                .notes(request.notes())
                .isDeleted(false)
                .build();

        Asset saved = assetRepository.save(asset);
        activityLogService.logActivity("ASSET", saved.getId(), "CREATE",
                "Logged new asset '" + saved.getName() + "' for godown: " + godown.getName());
        return mapToResponse(saved);
    }

    @Transactional
    public AssetResponse updateAsset(Long id, AssetRequest request) {
        Asset asset = assetRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found with ID: " + id));

        if (!asset.getGodown().getId().equals(request.godownId())) {
            Godown godown = godownRepository.findByIdAndIsDeletedFalse(request.godownId())
                    .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + request.godownId()));
            asset.setGodown(godown);
        }

        asset.setName(request.name());
        asset.setCategory(request.category());
        asset.setSerialNumber(request.serialNumber());
        asset.setQuantity(request.quantity());
        asset.setCost(request.cost());
        asset.setCondition(request.condition());
        asset.setPurchaseDate(request.purchaseDate());
        asset.setWarrantyExpiryDate(request.warrantyExpiryDate());
        asset.setNotes(request.notes());

        Asset saved = assetRepository.save(asset);
        activityLogService.logActivity("ASSET", saved.getId(), "UPDATE", "Updated asset: " + saved.getName());
        return mapToResponse(saved);
    }

    @Transactional
    public void deleteAsset(Long id) {
        Asset asset = assetRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Asset not found with ID: " + id));

        asset.setDeleted(true);
        assetRepository.save(asset);
        activityLogService.logActivity("ASSET", id, "DELETE", "Removed asset: " + asset.getName());
    }

    public AssetResponse mapToResponse(Asset a) {
        return new AssetResponse(
                a.getId(),
                a.getGodown().getId(),
                a.getGodown().getName(),
                a.getGodown().getCode(),
                a.getName(),
                a.getCategory(),
                a.getSerialNumber(),
                a.getQuantity(),
                a.getCost(),
                a.getCondition(),
                a.getPurchaseDate(),
                a.getWarrantyExpiryDate(),
                a.getNotes(),
                a.getCreatedAt(),
                a.getUpdatedAt()
        );
    }
}

