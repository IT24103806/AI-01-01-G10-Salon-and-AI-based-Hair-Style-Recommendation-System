package com.saloonx.saloonx.model;

import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String fullName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Column(nullable = false)
    private String role = "CUSTOMER";

    @Column(nullable = false)
    private String accountStatus = "ACTIVE";

    @Column(nullable = false, unique = true, length = 30)
    private String referralCode;

    @Column(length = 30)
    private String referredByCode;

    @Column(nullable = false)
    private Integer loyaltyPoints = 0;

    @Column(nullable = false)
    private Integer appointmentsCompleted = 0;

    @Column(nullable = false)
    private Integer reviewsSubmitted = 0;

    @Column(nullable = false)
    private Integer referralsCompleted = 0;

    @Column(nullable = false)
    private Integer totalReferralVisits = 0;

    @Column(nullable = false)
    private Integer loginCount = 0;

    @Column(nullable = false, length = 500)
    private String achievementBadges = "";

    @Column(nullable = false, length = 30)
    private String authProvider = "LOCAL";

    @Column(length = 191)
    private String providerUserId;

    @Column(nullable = false)
    private Boolean referralRewardUnlocked = false;

    private LocalDateTime lastLoginAt;

    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        if (referralCode == null || referralCode.isBlank()) {
            referralCode = "SLX-" + Long.toHexString(System.nanoTime()).toUpperCase();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
