package com.example.rgsenterprisesbackend.repository;

import com.example.rgsenterprisesbackend.model.AppUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<AppUser, Long> {
    Optional<AppUser> findByUsername(String username);
    Optional<AppUser> findByEmail(String email);
    Optional<AppUser> findByUsernameIgnoreCase(String username);
    Optional<AppUser> findByEmailIgnoreCase(String email);

    @Query("SELECT u FROM AppUser u WHERE LOWER(u.username) = LOWER(:identifier) OR (u.email IS NOT NULL AND LOWER(u.email) = LOWER(:identifier))")
    Optional<AppUser> findByUsernameOrEmailIgnoreCase(@Param("identifier") String identifier);

    boolean existsByUsername(String username);
    boolean existsByUsernameIgnoreCaseAndIdNot(String username, Long id);
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);
}

