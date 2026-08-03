package com.zanusafiri.service;

import com.zanusafiri.dto.AuthResponse;
import com.zanusafiri.dto.ChangePasswordRequest;
import com.zanusafiri.dto.LoginRequest;
import com.zanusafiri.dto.RegisterRequest;
import com.zanusafiri.dto.RefreshTokenRequest;
import com.zanusafiri.dto.UpdateProfileRequest;
import com.zanusafiri.dto.UserResponse;
import com.zanusafiri.entity.User;
import com.zanusafiri.exception.AuthenticationException;
import com.zanusafiri.exception.UserNotFoundException;
import com.zanusafiri.repository.UserRepository;
import com.zanusafiri.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@SuppressWarnings("null")
public class AuthService implements UserDetailsService {

    private static final Logger logger = LoggerFactory.getLogger(AuthService.class);
    private static final int TEMPORARY_PASSWORD_EXPIRY_HOURS = 24;

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider tokenProvider;
    private final NotificationService notificationService;
    
    @Autowired
    @Lazy
    private AuthenticationManager authenticationManager;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
    }

    /**
     * Login user and generate JWT token
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
            );
            SecurityContextHolder.getContext().setAuthentication(authentication);
            
            String token = tokenProvider.generateToken(authentication);
            String refreshToken = tokenProvider.generateRefreshToken(request.getUsername());
            
            User user = (User) authentication.getPrincipal();
            if (isTemporaryPasswordExpired(user)) {
                logger.warn("Expired temporary password used for user: {}", user.getUsername());
                throw new AuthenticationException("Temporary password has expired. Please contact an administrator for a new password.");
            }

            logger.info("User logged in successfully: {}", user.getUsername());

            return AuthResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .mustChangePassword(user.isMustChangePassword())
                .temporaryPasswordExpiresAt(user.getTemporaryPasswordExpiresAt())
                .message(user.isMustChangePassword()
                    ? "You are using a temporary password. Please change your password to continue."
                    : null)
                .build();
        } catch (BadCredentialsException e) {
            logger.warn("Failed login attempt for user: {}", request.getUsername());
            throw new AuthenticationException("Invalid username or password");
        } catch (org.springframework.security.authentication.InternalAuthenticationServiceException e) {
            logger.warn("Login failed for user: {} — {}", request.getUsername(), e.getCause() != null ? e.getCause().getMessage() : e.getMessage());
            throw new AuthenticationException("Invalid username or password");
        } catch (AuthenticationException e) {
            throw e;
        } catch (Exception e) {
            logger.error("Unexpected error during login for user: {}", request.getUsername(), e);
            throw new AuthenticationException("Authentication failed");
        }
    }

    /**
     * Register a new user (admin only)
     */
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        // Check if username already exists
        if (userRepository.existsByUsername(request.getUsername())) {
            logger.warn("Registration failed: username already taken - {}", request.getUsername());
            throw new RuntimeException("Username already taken");
        }

        // Check if email already exists
        if (userRepository.existsByEmail(request.getEmail())) {
            logger.warn("Registration failed: email already in use - {}", request.getEmail());
            throw new RuntimeException("Email already in use");
        }

        try {
            // Auto-generate a secure temporary password
            String generatedPassword = generateSecurePassword();
            LocalDateTime temporaryPasswordExpiresAt = LocalDateTime.now().plusHours(TEMPORARY_PASSWORD_EXPIRY_HOURS);

            User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(generatedPassword))
                .fullName(request.getFullName())
                .phoneNumber(request.getPhoneNumber())
                .role(User.Role.fromInput(request.getRole()))
                .active(true)
                .mustChangePassword(true)
                .temporaryPasswordExpiresAt(temporaryPasswordExpiresAt)
                .build();

            userRepository.save(user);

            logger.info("User {} created with a generated temporary password. Email sending is disabled; password will be shown to admin.", user.getUsername());

            String token = tokenProvider.generateTokenFromUsername(user.getUsername());
            String refreshToken = tokenProvider.generateRefreshToken(user.getUsername());

            logger.info("User registered successfully: {}", user.getUsername());

            notificationService.notifyAdmins(
                "New User Account Created",
                "A new " + request.getRole() + " account has been created for " + request.getFullName() + " (@" + request.getUsername() + ").",
                "USER"
            );

            return AuthResponse.builder()
                .token(token)
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .phoneNumber(user.getPhoneNumber())
                .role(user.getRole().name())
                .mustChangePassword(user.isMustChangePassword())
                .temporaryPasswordExpiresAt(user.getTemporaryPasswordExpiresAt())
                .emailSent(false)
                .message("Temporary password generated. Email sending is disabled; share this password manually with the user.")
                .generatedPassword(generatedPassword)
                .build();
        } catch (DataIntegrityViolationException e) {
            logger.error("Database constraint failed during registration", e);
            throw new RuntimeException("Registration failed: the selected role is not allowed by the database. Restart the backend once so database constraints can be updated.");
        } catch (Exception e) {
            logger.error("Error during registration", e);
            throw new RuntimeException("Registration failed: " + e.getMessage());
        }
    }

    /**
     * Get current authenticated user
     */
    public User getCurrentUser() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByUsername(username)
            .orElseThrow(() -> new UserNotFoundException("User not found: " + username));
    }

    /**
     * Refresh JWT token
     */
    public AuthResponse refreshToken(RefreshTokenRequest request) {
        try {
            if (!tokenProvider.validateToken(request.getRefreshToken())) {
                throw new AuthenticationException("Invalid or expired refresh token");
            }

            String username = tokenProvider.getUsernameFromToken(request.getRefreshToken());
            User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new UserNotFoundException("User not found: " + username));

            String newToken = tokenProvider.generateTokenFromUsername(username);

            logger.info("Token refreshed for user: {}", username);

            return AuthResponse.builder()
                .token(newToken)
                .tokenType("Bearer")
                .userId(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole().name())
                .mustChangePassword(user.isMustChangePassword())
                .temporaryPasswordExpiresAt(user.getTemporaryPasswordExpiresAt())
                .message(user.isMustChangePassword()
                    ? "You are using a temporary password. Please change your password to continue."
                    : null)
                .build();
        } catch (Exception e) {
            logger.error("Error during token refresh", e);
            throw new AuthenticationException("Token refresh failed");
        }
    }

    /**
     * Logout user (invalidate token on client side)
     */
    public void logout() {
        SecurityContextHolder.clearContext();
        logger.info("User logged out successfully");
    }

    /**
     * Get current user profile
     */
    public UserResponse getProfile() {
        return toUserResponse(getCurrentUser());
    }

    /**
     * Update current user profile
     */
    @Transactional
    public UserResponse updateProfile(UpdateProfileRequest request) {
        User user = getCurrentUser();
        if (!user.getEmail().equals(request.getEmail()) && userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already in use");
        }
        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhoneNumber(request.getPhoneNumber());
        userRepository.save(user);
        logger.info("Profile updated for user: {}", user.getUsername());
        return toUserResponse(user);
    }

    /**
     * Change current user password
     */
    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = getCurrentUser();
        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new RuntimeException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        user.setTemporaryPasswordExpiresAt(null);
        userRepository.save(user);
        logger.info("Password changed for user: {}", user.getUsername());
    }

    private UserResponse toUserResponse(User user) {
        return UserResponse.builder()
            .id(user.getId())
            .username(user.getUsername())
            .email(user.getEmail())
            .fullName(user.getFullName())
            .phoneNumber(user.getPhoneNumber())
            .role(user.getRole().name())
            .active(user.isActive())
            .mustChangePassword(user.isMustChangePassword())
            .temporaryPasswordExpiresAt(user.getTemporaryPasswordExpiresAt())
            .createdAt(user.getCreatedAt())
            .build();
    }

    private boolean isTemporaryPasswordExpired(User user) {
        return user.isMustChangePassword()
            && user.getTemporaryPasswordExpiresAt() != null
            && user.getTemporaryPasswordExpiresAt().isBefore(LocalDateTime.now());
    }

    private String generateSecurePassword() {
        // Generates a 12-character password with letters, digits, and symbols
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!";
        SecureRandom random = new SecureRandom();
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }
}
