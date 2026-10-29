package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.AppSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AppSettingsRepository extends JpaRepository<AppSettings, Long> {
    Optional<AppSettings> findFirstByOrderByIdAsc();
}

