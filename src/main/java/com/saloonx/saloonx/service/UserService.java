package com.saloonx.saloonx.service;

import com.saloonx.saloonx.model.User;
import com.saloonx.saloonx.repository.AppointmentRepository;
import com.saloonx.saloonx.repository.UserRepository;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private static final int APPOINTMENT_REWARD_POINTS = 25;
    private static final int REVIEW_REWARD_POINTS = 15;
    private static final int REFERRAL_REFERRER_POINTS = 100;
    private static final int REFERRAL_NEW_USER_POINTS = 40;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AppointmentRepository appointmentRepository;

    public User registerUser(User user) {
        return registerUser(user, null);
    }

    public User registerUser(User user, String referredByCode) {
        return registerUserWithRole(user, "CUSTOMER", referredByCode);
    }

    public User registerUserWithRole(User user, String role) {
        return registerUserWithRole(user, role, null);
    }

    @Transactional
    public User registerUserWithRole(User user, String role, String referredByCode) {
        String normalizedEmail = normalizeEmail(user.getEmail());
        user.setEmail(normalizedEmail);
        user.setFullName(user.getFullName() != null ? user.getFullName().trim() : null);

        if (userRepository.findByEmail(normalizedEmail).isPresent()) {
            throw new RuntimeException("Email already exists!");
        }

        validatePasswordStrength(user.getPassword());

        if (referredByCode != null && !referredByCode.isBlank()) {
            String normalizedReferralCode = referredByCode.trim().toUpperCase();
            if (userRepository.findByReferralCode(normalizedReferralCode).isEmpty()) {
                throw new RuntimeException("Referral code is invalid.");
            }
            user.setReferredByCode(normalizedReferralCode);
        }

        user.setPassword(BCrypt.hashpw(user.getPassword(), BCrypt.gensalt()));
        user.setRole(role);
        user.setAuthProvider(user.getAuthProvider() == null || user.getAuthProvider().isBlank() ? "LOCAL" : user.getAuthProvider());
        user.setReferralCode(generateUniqueReferralCode());
        user.setAccountStatus("ACTIVE");
        user.setAchievementBadges("");

        User savedUser = userRepository.save(user);
        refreshGamification(savedUser);
        return userRepository.save(savedUser);
    }

    public User loginUser(String email, String password) {
        Optional<User> userOpt = userRepository.findByEmail(normalizeEmail(email));
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            if (BCrypt.checkpw(password, user.getPassword())) {
                return user;
            }
        }
        return null;
    }

    public User recordSuccessfulLogin(User user) {
        user.setLastLoginAt(LocalDateTime.now());
        user.setLoginCount(safeInt(user.getLoginCount()) + 1);
        return userRepository.save(user);
    }

    @Transactional
    public User updateUser(User user, String newPassword) {
        String normalizedEmail = normalizeEmail(user.getEmail());
        user.setEmail(normalizedEmail);
        user.setFullName(user.getFullName() != null ? user.getFullName().trim() : null);

        Optional<User> existingEmailUser = userRepository.findByEmail(normalizedEmail);
        if (existingEmailUser.isPresent() && !existingEmailUser.get().getId().equals(user.getId())) {
            throw new RuntimeException("Email already taken by another user.");
        }

        if (newPassword != null && !newPassword.isEmpty()) {
            validatePasswordStrength(newPassword);
            user.setPassword(BCrypt.hashpw(newPassword, BCrypt.gensalt()));
        }

        User savedUser = userRepository.save(user);
        refreshGamification(savedUser);
        return userRepository.save(savedUser);
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public long countUsersByRole(String role) {
        return userRepository.countByRole(role);
    }

    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(normalizeEmail(email));
    }

    public Optional<User> findByProvider(String provider, String providerUserId) {
        if (provider == null || providerUserId == null || providerUserId.isBlank()) {
            return Optional.empty();
        }
        return userRepository.findByAuthProviderAndProviderUserId(provider.trim().toUpperCase(), providerUserId.trim());
    }

    @Transactional
    public User provisionOAuthUser(String provider, String providerUserId, String email, String fullName, String requestedRole) {
        String normalizedProvider = provider == null ? "OAUTH2" : provider.trim().toUpperCase();
        String normalizedProviderUserId = providerUserId == null ? null : providerUserId.trim();
        String normalizedEmail = resolveOAuthEmail(normalizedProvider, normalizedProviderUserId, email);
        String normalizedRole = "CUSTOMER";
        String resolvedName = (fullName == null || fullName.isBlank()) ? deriveDisplayName(normalizedEmail, normalizedProvider) : fullName.trim();

        Optional<User> byProvider = findByProvider(normalizedProvider, normalizedProviderUserId);
        if (byProvider.isPresent()) {
            User existingUser = byProvider.get();
            updateOAuthProfile(existingUser, normalizedEmail, resolvedName, normalizedProviderUserId);
            return userRepository.save(existingUser);
        }

        if (normalizedEmail != null) {
            Optional<User> byEmail = userRepository.findByEmail(normalizedEmail);
            if (byEmail.isPresent()) {
                User existingUser = byEmail.get();
                updateOAuthProfile(existingUser, normalizedEmail, resolvedName, normalizedProviderUserId);
                return userRepository.save(existingUser);
            }
        }

        if (normalizedEmail == null || normalizedEmail.isBlank()) {
            throw new RuntimeException("The selected OAuth provider did not return an email address required by this application.");
        }

        User newUser = new User();
        newUser.setFullName(resolvedName);
        newUser.setEmail(normalizedEmail);
        newUser.setPassword(BCrypt.hashpw("OAuth2-" + UUID.randomUUID(), BCrypt.gensalt()));
        newUser.setRole(normalizedRole);
        newUser.setAuthProvider(normalizedProvider);
        newUser.setProviderUserId(normalizedProviderUserId);
        newUser.setReferralCode(generateUniqueReferralCode());
        newUser.setAccountStatus("ACTIVE");
        newUser.setAchievementBadges("");

        User savedUser = userRepository.save(newUser);
        refreshGamification(savedUser);
        return userRepository.save(savedUser);
    }

    @Transactional
    public void adminDeleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found."));
        deleteUserAndRelations(user);
    }

    @Transactional
    public void deleteUser(User user, String password) {
        if (!BCrypt.checkpw(password, user.getPassword())) {
            throw new RuntimeException("Invalid password.");
        }
        deleteUserAndRelations(user);
    }

    @Transactional
    public User awardAppointmentCompletion(User user) {
        user.setLoyaltyPoints(safeInt(user.getLoyaltyPoints()) + APPOINTMENT_REWARD_POINTS);
        user.setAppointmentsCompleted(Math.max(safeInt(user.getAppointmentsCompleted()) + 1,
                (int) appointmentRepository.countByUserIdAndStatus(user.getId(), "COMPLETED")));
        refreshGamification(user);
        User savedUser = userRepository.save(user);
        unlockReferralRewardIfEligible(savedUser);
        return savedUser;
    }

    @Transactional
    public User awardReviewSubmission(User user) {
        user.setLoyaltyPoints(safeInt(user.getLoyaltyPoints()) + REVIEW_REWARD_POINTS);
        refreshGamification(user);
        User savedUser = userRepository.save(user);
        return savedUser;
    }

    @Transactional
    public void refreshGamification(User user) {
        int completedAppointments = Math.max(safeInt(user.getAppointmentsCompleted()),
                (int) appointmentRepository.countByUserIdAndStatus(user.getId(), "COMPLETED"));

        user.setAppointmentsCompleted(completedAppointments);
        user.setAchievementBadges(String.join(",", determineBadges(user)));
    }

    public Map<String, Object> buildProfileSummary(User user) {
        refreshGamification(user);
        userRepository.save(user);

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("loyaltyPoints", safeInt(user.getLoyaltyPoints()));
        summary.put("loyaltyTier", determineTier(safeInt(user.getLoyaltyPoints())));
        summary.put("referralCode", user.getReferralCode());
        summary.put("referredByCode", user.getReferredByCode());
        summary.put("appointmentsCompleted", safeInt(user.getAppointmentsCompleted()));
        summary.put("reviewsSubmitted", safeInt(user.getReviewsSubmitted()));
        summary.put("referralsCompleted", safeInt(user.getReferralsCompleted()));
        summary.put("loginCount", safeInt(user.getLoginCount()));
        summary.put("badges", getBadgeList(user));
        summary.put("nextBadge", determineNextBadge(user));
        summary.put("accountStatus", user.getAccountStatus());
        return summary;
    }

    public List<String> getBadgeList(User user) {
        if (user.getAchievementBadges() == null || user.getAchievementBadges().isBlank()) {
            return List.of();
        }
        return List.of(user.getAchievementBadges().split(","));
    }

    public String determineTier(int points) {
        if (points >= 250) {
            return "Diamond";
        }
        if (points >= 150) {
            return "Gold";
        }
        if (points >= 75) {
            return "Silver";
        }
        return "Bronze";
    }

    public String determineNextBadge(User user) {
        int appointments = safeInt(user.getAppointmentsCompleted());
        int reviews = safeInt(user.getReviewsSubmitted());
        int referrals = safeInt(user.getReferralsCompleted());

        if (appointments < 1) {
            return "First Appointment";
        }
        if (appointments < 5) {
            return "Regular Customer";
        }
        if (appointments < 10) {
            return "VIP";
        }
        if (reviews < 5) {
            return "Reviewer";
        }
        if (referrals < 3) {
            return "Social Butterfly";
        }
        return "All milestone badges unlocked";
    }

    private List<String> determineBadges(User user) {
        List<String> badges = new ArrayList<>();
        int appointments = safeInt(user.getAppointmentsCompleted());
        int reviews = safeInt(user.getReviewsSubmitted());
        int referrals = safeInt(user.getReferralsCompleted());

        if (appointments >= 1) {
            badges.add("First Appointment");
        }
        if (appointments >= 5) {
            badges.add("Regular Customer");
        }
        if (appointments >= 10) {
            badges.add("VIP");
        }
        if (reviews >= 5) {
            badges.add("Reviewer");
        }
        if (referrals >= 3) {
            badges.add("Social Butterfly");
        }
        return badges;
    }

    private void unlockReferralRewardIfEligible(User user) {
        if (Boolean.TRUE.equals(user.getReferralRewardUnlocked()) || user.getReferredByCode() == null || user.getReferredByCode().isBlank()) {
            return;
        }

        if (appointmentRepository.countByUserIdAndStatus(user.getId(), "COMPLETED") < 1) {
            return;
        }

        Optional<User> referrerOpt = userRepository.findByReferralCode(user.getReferredByCode());
        if (referrerOpt.isEmpty()) {
            user.setReferralRewardUnlocked(true);
            userRepository.save(user);
            return;
        }

        User referrer = referrerOpt.get();
        referrer.setLoyaltyPoints(safeInt(referrer.getLoyaltyPoints()) + REFERRAL_REFERRER_POINTS);
        referrer.setReferralsCompleted(safeInt(referrer.getReferralsCompleted()) + 1);
        referrer.setTotalReferralVisits(safeInt(referrer.getTotalReferralVisits()) + 1);
        refreshGamification(referrer);
        userRepository.save(referrer);

        user.setLoyaltyPoints(safeInt(user.getLoyaltyPoints()) + REFERRAL_NEW_USER_POINTS);
        user.setReferralRewardUnlocked(true);
        refreshGamification(user);
        userRepository.save(user);
    }

    private void validatePasswordStrength(String password) {
        if (password == null || password.length() < 8) {
            throw new RuntimeException("Password must be at least 8 characters long.");
        }
        boolean hasLetter = password.chars().anyMatch(Character::isLetter);
        boolean hasDigit = password.chars().anyMatch(Character::isDigit);
        if (!hasLetter || !hasDigit) {
            throw new RuntimeException("Password must contain both letters and numbers.");
        }
    }

    private String generateUniqueReferralCode() {
        String code;
        do {
            code = "SLX-" + UUID.randomUUID().toString().replace("-", "").substring(0, 8).toUpperCase();
        } while (userRepository.findByReferralCode(code).isPresent());
        return code;
    }

    private void updateOAuthProfile(User user, String email, String fullName, String providerUserId) {
        if (email != null && !email.isBlank()) {
            user.setEmail(email);
        }
        if (fullName != null && !fullName.isBlank()) {
            user.setFullName(fullName);
        }
        if (providerUserId != null && !providerUserId.isBlank()) {
            user.setProviderUserId(providerUserId);
        }
    }

    private String resolveOAuthEmail(String provider, String providerUserId, String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail != null && !normalizedEmail.isBlank()) {
            return normalizedEmail;
        }
        if ("FACEBOOK".equals(provider) && providerUserId != null && !providerUserId.isBlank()) {
            return "facebook_" + providerUserId + "@oauth.salonoski.local";
        }
        return normalizedEmail;
    }

    private String deriveDisplayName(String email, String provider) {
        if (email != null && email.contains("@")) {
            return email.substring(0, email.indexOf('@'));
        }
        return provider + " User";
    }

    private void deleteUserAndRelations(User user) {
        Long userId = user.getId();

        appointmentRepository.findByUserId(userId).forEach(appointment -> {
            appointment.setUser(null);
            appointmentRepository.save(appointment);
        });

        userRepository.delete(user);
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase();
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }
}

