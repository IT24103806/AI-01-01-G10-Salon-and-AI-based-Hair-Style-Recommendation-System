package com.saloonx.saloonx.model;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
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
    @NotBlank(message = "Full name is required.")
    @Size(min = 2, max = 100, message = "Full name must be between 2 and 100 characters.")
    private String fullName;

    @Column(nullable = false, unique = true)
    @NotBlank(message = "Email address is required.")
    @Email(message = "Enter a valid email address.")
    @Size(max = 191, message = "Email address must be 191 characters or fewer.")
    private String email;

    @Column(nullable = false)
    @NotBlank(message = "Password is required.")
    @Size(min = 8, max = 72, message = "Password must be between 8 and 72 characters.")
    private String password;

    @Column(nullable = false)
    @NotBlank(message = "Role is required.")
    private String role = "CUSTOMER";

    @Column(nullable = false)
    @NotBlank(message = "Account status is required.")
    private String accountStatus = "ACTIVE";

    @Column(nullable = false, unique = true, length = 30)
    @NotBlank(message = "Referral code is required.")
    @Size(max = 30, message = "Referral code must be 30 characters or fewer.")
    private String referralCode;

    @Column(length = 30)
    @Pattern(regexp = "^$|^SLX-[A-Z0-9]{6,26}$", message = "Referral code must match the expected format.")
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
    @NotBlank(message = "Authentication provider is required.")
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
