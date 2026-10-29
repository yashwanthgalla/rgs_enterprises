package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.Document;
import com.example.rgsenterprisesbackend.model.DocumentType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByGodownIdAndIsDeletedFalseOrderByCreatedAtDesc(Long godownId);

    Optional<Document> findByIdAndIsDeletedFalse(Long id);

    boolean existsByGodownIdAndIsDeletedFalse(Long godownId);

    @Query("SELECT d FROM Document d WHERE d.isDeleted = false AND " +
            "(:godownId IS NULL OR d.godown.id = :godownId) AND " +
            "(:documentType IS NULL OR d.documentType = :documentType) AND " +
            "(:query IS NULL OR (LOWER(d.fileName) LIKE :query OR LOWER(d.description) LIKE :query))")
    Page<Document> findWithFilters(@Param("godownId") Long godownId,
                                  @Param("documentType") DocumentType documentType,
                                  @Param("query") String query,
                                  Pageable pageable);
}

