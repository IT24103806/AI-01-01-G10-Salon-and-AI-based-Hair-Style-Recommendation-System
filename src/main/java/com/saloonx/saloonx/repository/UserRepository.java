package com.saloonx.saloonx.repository;

import com.saloonx.saloonx.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    Optional<User> findByFullName(String fullName);

    Optional<User> findByAuthProviderAndProviderUserId(String authProvider, String providerUserId);

    Optional<User> findByReferralCode(String referralCode);

    long countByRole(String role);

    long countByRoleAndAccountStatus(String role, String accountStatus);
}
