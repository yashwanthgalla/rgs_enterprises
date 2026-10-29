package com.example.rgsenterprisesbackend.service;

import com.example.rgsenterprisesbackend.dto.DocumentResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.exception.BadRequestException;
import com.example.rgsenterprisesbackend.exception.ResourceNotFoundException;
import com.example.rgsenterprisesbackend.model.Document;
import com.example.rgsenterprisesbackend.model.DocumentType;
import com.example.rgsenterprisesbackend.model.Godown;
import com.example.rgsenterprisesbackend.repository.DocumentRepository;
import com.example.rgsenterprisesbackend.repository.GodownRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final GodownRepository godownRepository;
    private final ActivityLogService activityLogService;

    @Value("${app.supabase.url:https://example.supabase.co}")
    private String supabaseUrl;

    @Value("${app.supabase.service-key:mock-service-key}")
    private String supabaseServiceKey;

    @Value("${app.supabase.storage-bucket:godown-documents}")
    private String storageBucket;

    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx"
    );

    private static final long MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

    private final Path localUploadDir = Paths.get("uploads/documents").toAbsolutePath().normalize();

    @Transactional(readOnly = true)
    public PagedResponse<DocumentResponse> getDocuments(Long godownId, DocumentType documentType, String query, Pageable pageable) {
        String queryFilter = (query != null && !query.isBlank()) ? "%" + query.trim().toLowerCase() + "%" : null;
        Page<Document> page = documentRepository.findWithFilters(godownId, documentType, queryFilter, pageable);
        return PagedResponse.from(page.map(this::mapToResponse));
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> getDocumentsByGodown(Long godownId) {
        return documentRepository.findByGodownIdAndIsDeletedFalseOrderByCreatedAtDesc(godownId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public DocumentResponse getDocumentById(Long id) {
        Document document = documentRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + id));
        return mapToResponse(document);
    }

    @Transactional
    public DocumentResponse uploadDocument(MultipartFile file, Long godownId, DocumentType documentType, String description) {
        if (file.isEmpty()) {
            throw new BadRequestException("Uploaded file cannot be empty");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new BadRequestException("File size exceeds 5MB limit");
        }

        String originalFilename = file.getOriginalFilename();
        if (originalFilename == null || !originalFilename.contains(".")) {
            throw new BadRequestException("Invalid file name format");
        }

        String extension = originalFilename.substring(originalFilename.lastIndexOf('.') + 1).toLowerCase();
        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new BadRequestException("File format ." + extension + " is not allowed. Supported: PDF, PNG, JPG, JPEG, DOC, DOCX, XLS, XLSX");
        }

        Godown godown = null;
        if (godownId != null) {
            godown = godownRepository.findByIdAndIsDeletedFalse(godownId)
                    .orElseThrow(() -> new ResourceNotFoundException("Godown not found with ID: " + godownId));
        }

        String uniqueFileName = UUID.randomUUID() + "_" + originalFilename.replaceAll("[^a-zA-Z0-9.-]", "_");
        String storagePath = "godowns/" + (godownId != null ? godownId : "general") + "/" + uniqueFileName;
        String publicUrl = supabaseUrl + "/storage/v1/object/public/" + storageBucket + "/" + storagePath;

        // Save local backup copy for offline reliability & instant download endpoint
        try {
            Files.createDirectories(localUploadDir);
            Path targetLocation = localUploadDir.resolve(uniqueFileName);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
        } catch (IOException ex) {
            log.warn("Could not save local copy of uploaded file: {}", ex.getMessage());
        }

        // Upload to Supabase Storage if remote service key is configured
        uploadToSupabaseStorageSilently(file, storagePath);

        Document doc = Document.builder()
                .godown(godown)
                .fileName(originalFilename)
                .fileType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileSize(file.getSize())
                .storagePath(storagePath)
                .publicUrl(publicUrl)
                .documentType(documentType != null ? documentType : DocumentType.OTHER)
                .description(description)
                .isDeleted(false)
                .build();

        Document saved = documentRepository.save(doc);
        String godownName = (godown != null) ? godown.getName() : "General";
        activityLogService.logActivity("DOCUMENT", saved.getId(), "CREATE",
                "Uploaded document '" + originalFilename + "' for " + godownName);
        return mapToResponse(saved);
    }

    private void uploadToSupabaseStorageSilently(MultipartFile file, String storagePath) {
        if (supabaseUrl == null || supabaseUrl.contains("example.supabase.co") || supabaseServiceKey == null || supabaseServiceKey.contains("mock")) {
            log.info("Supabase storage not configured; stored locally for download.");
            return;
        }

        try {
            RestTemplate restTemplate = new RestTemplate();
            String endpoint = supabaseUrl + "/storage/v1/object/" + storageBucket + "/" + storagePath;
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(supabaseServiceKey);
            headers.setContentType(MediaType.parseMediaType(file.getContentType() != null ? file.getContentType() : "application/octet-stream"));

            HttpEntity<byte[]> requestEntity = new HttpEntity<>(file.getBytes(), headers);
            ResponseEntity<String> response = restTemplate.exchange(endpoint, HttpMethod.POST, requestEntity, String.class);
            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Successfully pushed file {} to Supabase Storage bucket {}", storagePath, storageBucket);
            }
        } catch (Exception ex) {
            log.warn("Supabase Storage upload skipped or failed (local copy retained): {}", ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Resource loadFileAsResource(Long documentId) {
        Document doc = documentRepository.findByIdAndIsDeletedFalse(documentId)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + documentId));

        String localName = doc.getStoragePath().substring(doc.getStoragePath().lastIndexOf('/') + 1);
        Path filePath = localUploadDir.resolve(localName).normalize();

        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return resource;
            }
        } catch (Exception ex) {
            log.warn("Could not find file on local path: {}", filePath);
        }

        // Return empty or fallback resource if local file not found
        throw new ResourceNotFoundException("File content not available on storage server for document: " + doc.getFileName());
    }

    @Transactional
    public void deleteDocument(Long id) {
        Document doc = documentRepository.findByIdAndIsDeletedFalse(id)
                .orElseThrow(() -> new ResourceNotFoundException("Document not found with ID: " + id));

        doc.setDeleted(true);
        documentRepository.save(doc);
        activityLogService.logActivity("DOCUMENT", id, "DELETE", "Deleted document: " + doc.getFileName());
    }

    public DocumentResponse mapToResponse(Document d) {
        String godownName = d.getGodown() != null ? d.getGodown().getName() : "General";
        return new DocumentResponse(
                d.getId(),
                d.getGodown() != null ? d.getGodown().getId() : null,
                godownName,
                d.getFileName(),
                d.getFileType(),
                d.getFileSize(),
                d.getStoragePath(),
                d.getPublicUrl(),
                d.getDocumentType(),
                d.getDescription(),
                d.getCreatedAt()
        );
    }
}

