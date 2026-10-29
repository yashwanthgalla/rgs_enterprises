package com.example.rgsenterprisesbackend.controller;

import com.example.rgsenterprisesbackend.dto.ApiResponse;
import com.example.rgsenterprisesbackend.dto.DocumentResponse;
import com.example.rgsenterprisesbackend.dto.PagedResponse;
import com.example.rgsenterprisesbackend.model.DocumentType;
import com.example.rgsenterprisesbackend.service.DocumentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
@Tag(name = "Documents Vault", description = "Lease deeds, invoices, compliance files, and photo attachments")
public class DocumentController {

    private final DocumentService documentService;

    @GetMapping
    @Operation(summary = "Search documents with filters and pagination")
    public ResponseEntity<ApiResponse<PagedResponse<DocumentResponse>>> getDocuments(
            @RequestParam(required = false) Long godownId,
            @RequestParam(required = false) DocumentType documentType,
            @RequestParam(required = false) String query,
            @PageableDefault(size = 15, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        PagedResponse<DocumentResponse> response = documentService.getDocuments(godownId, documentType, query, pageable);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/godown/{godownId}")
    @Operation(summary = "Get all documents linked to a godown")
    public ResponseEntity<ApiResponse<List<DocumentResponse>>> getDocumentsByGodown(@PathVariable Long godownId) {
        List<DocumentResponse> response = documentService.getDocumentsByGodown(godownId);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get single document metadata")
    public ResponseEntity<ApiResponse<DocumentResponse>> getDocumentById(@PathVariable Long id) {
        DocumentResponse response = documentService.getDocumentById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Upload document (max 5MB: pdf, png, jpg, jpeg, doc, docx, xls, xlsx)")
    public ResponseEntity<ApiResponse<DocumentResponse>> uploadDocument(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "godownId", required = false) Long godownId,
            @RequestParam(value = "documentType", required = false) DocumentType documentType,
            @RequestParam(value = "description", required = false) String description
    ) {
        DocumentResponse response = documentService.uploadDocument(file, godownId, documentType, description);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("File uploaded successfully", response));
    }

    @GetMapping("/{id}/download")
    @Operation(summary = "Download stored document binary")
    public ResponseEntity<Resource> downloadFile(@PathVariable Long id) {
        DocumentResponse metadata = documentService.getDocumentById(id);
        Resource resource = documentService.loadFileAsResource(id);

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(metadata.fileType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + metadata.fileName() + "\"")
                .body(resource);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Soft delete document")
    public ResponseEntity<ApiResponse<Void>> deleteDocument(@PathVariable Long id) {
        documentService.deleteDocument(id);
        return ResponseEntity.ok(ApiResponse.ok("Document deleted successfully", null));
    }
}

