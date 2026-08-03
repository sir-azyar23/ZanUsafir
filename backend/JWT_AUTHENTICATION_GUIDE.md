# JWT Authentication Implementation Guide

## Overview
This document provides a comprehensive guide to the JWT authentication implementation in the ZanUsafiri Route Management System.

## Architecture Components

### 1. JWT Token Provider (`JwtTokenProvider.java`)
Responsible for generating, validating, and parsing JWT tokens.

**Key Features:**
- Generates access tokens with 24-hour expiration
- Generates refresh tokens with 7-day expiration
- Includes role information in token claims using HS512 signature algorithm
- Validates token signature, expiration, and format

**Methods:**
- `generateToken(Authentication)` - Generate token from authentication with roles
- `generateTokenFromUsername(String)` - Generate token from username
- `generateRefreshToken(String)` - Generate refresh token
- `getUsernameFromToken(String)` - Extract username from token
- `getRolesFromToken(String)` - Extract roles from token claims
- `validateToken(String)` - Validate token integrity and expiration

### 2. JWT Authentication Filter (`JwtAuthenticationFilter.java`)
Intercepts requests and extracts JWT tokens from Authorization headers.

**Key Features:**
- Extracts token from "Bearer <token>" format
- Validates token and loads user details
- Sets authentication in SecurityContext for request processing
- Handles all exceptions silently to allow unauthenticated access to public endpoints

**Flow:**
1. Extract token from Authorization header
2. Validate token signature and expiration
3. Load user details from database
4. Set authentication in SecurityContext
5. Continue filter chain

### 3. Authentication Service (`AuthService.java`)
Business logic for user authentication, registration, and token management.

**Key Methods:**
- `login(LoginRequest)` - Authenticate user and return JWT token
- `register(RegisterRequest)` - Register new user (admin only)
- `refreshToken(RefreshTokenRequest)` - Generate new token from refresh token
- `logout()` - Clear security context
- `getCurrentUser()` - Get authenticated user details
- `loadUserByUsername(String)` - Load user details (implements UserDetailsService)

**Error Handling:**
- Throws `AuthenticationException` for invalid credentials
- Throws `UserNotFoundException` for non-existent users
- Logs all authentication attempts and failures

### 4. Global Exception Handler (`GlobalExceptionHandler.java`)
Centralized exception handling for consistent error responses.

**Handled Exceptions:**
- `AuthenticationException` - 401 Unauthorized
- `UnauthorizedException` - 403 Forbidden
- `UserNotFoundException` - 404 Not Found
- `BadCredentialsException` - 401 Unauthorized
- `MethodArgumentNotValidException` - 400 Bad Request (validation errors)
- General `RuntimeException` - 400 Bad Request
- `Exception` - 500 Internal Server Error

**Response Format:**
```json
{
  "status": 401,
  "message": "Invalid username or password",
  "error": "Bad Credentials",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/auth/login"
}
```

## API Endpoints

### 1. Login
**Endpoint:** `POST /auth/login`
**Authentication:** Public
**Request:**
```json
{
  "username": "admin",
  "password": "password123"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "tokenType": "Bearer",
  "userId": 1,
  "username": "admin",
  "email": "admin@example.com",
  "fullName": "Administrator",
  "role": "ADMIN"
}
```

### 2. Register User (Admin Only)
**Endpoint:** `POST /auth/register`
**Authentication:** Required (ADMIN role)
**Request:**
```json
{
  "username": "staff001",
  "email": "staff001@example.com",
  "password": "securePassword123",
  "fullName": "Staff Member",
  "role": "STAFF"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "tokenType": "Bearer",
  "userId": 2,
  "username": "staff001",
  "email": "staff001@example.com",
  "fullName": "Staff Member",
  "role": "STAFF"
}
```

### 3. Get Current User
**Endpoint:** `GET /auth/me`
**Authentication:** Required
**Response:**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "password": "$2a$10$...",
  "fullName": "Administrator",
  "role": "ADMIN",
  "active": true,
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-15T10:30:00"
}
```

### 4. Refresh Token
**Endpoint:** `POST /auth/refresh`
**Authentication:** Public
**Request:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzUxMiJ9..."
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "tokenType": "Bearer",
  "userId": 1,
  "username": "admin",
  "email": "admin@example.com",
  "fullName": "Administrator",
  "role": "ADMIN"
}
```

### 5. Logout
**Endpoint:** `POST /auth/logout`
**Authentication:** Required
**Response:**
```json
{
  "message": "Logged out successfully"
}
```

## Security Configuration

### Endpoint Authorization
```
Public endpoints:
- POST /auth/login
- POST /auth/register (requires ADMIN role)
- POST /auth/refresh
- POST /auth/logout (requires authentication)
- GET /routes/**
- GET /stops/**
- GET /fares/**

Admin-only endpoints:
- GET /users/**
- GET /audit-logs/**
- POST /auth/register

All other endpoints:
- Require authentication
```

### CORS Configuration
Configured for development:
- Allowed origins: `http://localhost:5173`, `http://localhost:3000`
- Allowed methods: GET, POST, PUT, DELETE, OPTIONS, PATCH
- Allowed headers: All (*)
- Credentials: Enabled

**Production Note:** Update `corsConfigurationSource()` in `SecurityConfig.java` with actual frontend URL.

### Session Management
- **Session Policy:** STATELESS (JWT-based)
- **CSRF Protection:** Disabled (not needed for stateless JWT)

## User Roles

### ADMIN Role
- Full system access
- Can create new users
- Can access audit logs
- Can manage all resources

### STAFF Role
- Limited access
- Can view and manage assigned routes/buses
- Cannot access user management
- Cannot access audit logs

## Password Encryption
- **Algorithm:** BCrypt with strength 10
- **Encoder:** `BCryptPasswordEncoder`
- Passwords are hashed before storing in database
- Plain passwords are never stored

## JWT Token Format

### Access Token Claims
```json
{
  "sub": "username",
  "roles": "ROLE_ADMIN,ROLE_STAFF",
  "iat": 1704067200,
  "exp": 1704153600
}
```

### Refresh Token Claims
```json
{
  "sub": "username",
  "type": "refresh",
  "iat": 1704067200,
  "exp": 1704672000
}
```

## Configuration

### application.yml
```yaml
app:
  jwt:
    secret: ZanUsafiriSecretKey2024VeryLongSecretKeyForJWTTokenGenerationAndValidation
    expiration: 86400000  # 24 hours in milliseconds
    refresh-expiration: 604800000  # 7 days in milliseconds
```

**Important:** Change the JWT secret in production to a long, random string.

## Request Headers

### Authentication Header Format
```
Authorization: Bearer <token>
```

**Example:**
```
Authorization: Bearer eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGVzIjoiUk9MRV9BRE1JTiIsImlhdCI6MTcwNDA2NzIwMCwiZXhwIjoxNzA0MTUzNjAwfQ...
```

## Error Responses

### Invalid Credentials
```json
{
  "status": 401,
  "message": "Invalid username or password",
  "error": "Bad Credentials",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/auth/login"
}
```

### Expired Token
```json
{
  "status": 401,
  "message": "JWT token is expired",
  "error": "Authentication Failed",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/buses"
}
```

### Access Denied (No ADMIN role)
```json
{
  "status": 403,
  "message": "Access Denied",
  "error": "Access Forbidden",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/auth/register"
}
```

### Validation Error
```json
{
  "status": 400,
  "message": "username: Username is required; password: Password is required; ",
  "error": "Validation Failed",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/auth/login"
}
```

## Best Practices

### For Frontend Integration

1. **Store Tokens Securely:**
   - Store access token in memory or sessionStorage
   - Store refresh token in httpOnly cookie (recommended)
   - Never store tokens in localStorage for sensitive apps

2. **Token Refresh Flow:**
   ```
   1. Attempt request with access token
   2. If 401 (expired), use refresh token to get new access token
   3. Retry original request with new access token
   4. If refresh token also expired, redirect to login
   ```

3. **Authorization Headers:**
   - Always include `Authorization: Bearer <token>` header
   - Remove bearer token on logout

4. **Error Handling:**
   - Handle 401 by redirecting to login
   - Handle 403 by showing "Access Denied" message
   - Handle 400 by showing validation error messages

### For Backend

1. **Security:**
   - Change JWT secret in production
   - Use HTTPS only
   - Implement rate limiting on login endpoint
   - Add logout token blacklisting for immediate revocation

2. **Monitoring:**
   - Log all authentication attempts
   - Monitor failed login attempts
   - Alert on suspicious activity

3. **Testing:**
   - Test with valid credentials
   - Test with invalid credentials
   - Test token expiration
   - Test role-based access control

## Troubleshooting

### Common Issues

1. **"JWT signature does not match locally computed signature"**
   - Cause: JWT secret in `application.yml` doesn't match token generation
   - Solution: Ensure same secret is used for token generation and validation

2. **"JWT token is expired"**
   - Cause: Token has been valid for more than 24 hours
   - Solution: Use refresh token to get new access token

3. **"Could not set user authentication in security context"**
   - Cause: User doesn't exist in database
   - Solution: Ensure user was registered before attempting login

4. **"Access Denied" for ADMIN-only endpoints**
   - Cause: User has STAFF role instead of ADMIN
   - Solution: Use admin account or contact administrator to upgrade role

## Future Enhancements

1. **Token Blacklisting:** Implement Redis-based token blacklist for immediate logout
2. **Multi-factor Authentication:** Add 2FA support
3. **Token Rotation:** Automatically rotate tokens for enhanced security
4. **Rate Limiting:** Add rate limiting on authentication endpoints
5. **LDAP Integration:** Integrate with LDAP for enterprise authentication
6. **OAuth2/OpenID Connect:** Support third-party authentication providers
