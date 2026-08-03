# JWT Authentication Testing Guide

## Quick Start

### 1. Start the Backend Server
```bash
cd backend
mvn spring-boot:run
```
Server runs on: `http://localhost:8080/api`

### 2. Test Authentication Endpoints

## Test Cases with cURL

### Test 1: Login with Valid Credentials
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "password123"
  }'
```

**Expected Response (200 OK):**
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

### Test 2: Login with Invalid Credentials
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "wrongpassword"
  }'
```

**Expected Response (401 Unauthorized):**
```json
{
  "status": 401,
  "message": "Invalid username or password",
  "error": "Bad Credentials",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/auth/login"
}
```

### Test 3: Get Current User (Authenticated)
```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <your_token_here>"
```

**Expected Response (200 OK):**
```json
{
  "id": 1,
  "username": "admin",
  "email": "admin@example.com",
  "fullName": "Administrator",
  "role": "ADMIN",
  "active": true,
  "createdAt": "2024-01-01T10:00:00",
  "updatedAt": "2024-01-15T10:30:00"
}
```

### Test 4: Register New User (Admin Only)
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token_here>" \
  -d '{
    "username": "staff001",
    "email": "staff001@example.com",
    "password": "securePass123",
    "fullName": "John Doe",
    "role": "STAFF"
  }'
```

**Expected Response (200 OK):**
```json
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "tokenType": "Bearer",
  "userId": 2,
  "username": "staff001",
  "email": "staff001@example.com",
  "fullName": "John Doe",
  "role": "STAFF"
}
```

### Test 5: Register Without Admin Role (Should Fail)
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staff_token_here>" \
  -d '{
    "username": "staff002",
    "email": "staff002@example.com",
    "password": "securePass123",
    "fullName": "Jane Doe",
    "role": "STAFF"
  }'
```

**Expected Response (403 Forbidden):**
```json
{
  "status": 403,
  "message": "Access is denied",
  "error": "Access Forbidden",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/auth/register"
}
```

### Test 6: Refresh Token
```bash
curl -X POST http://localhost:8080/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<your_refresh_token_here>"
  }'
```

**Expected Response (200 OK):**
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

### Test 7: Logout
```bash
curl -X POST http://localhost:8080/api/auth/logout \
  -H "Authorization: Bearer <your_token_here>"
```

**Expected Response (200 OK):**
```json
{
  "message": "Logged out successfully"
}
```

### Test 8: Access Protected Endpoint Without Token
```bash
curl -X GET http://localhost:8080/api/buses
```

**Expected Response (401 Unauthorized):**
```json
{
  "status": 401,
  "message": "Unauthorized",
  "error": "Unauthorized",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/buses"
}
```

### Test 9: Access Protected Endpoint With Token
```bash
curl -X GET http://localhost:8080/api/buses \
  -H "Authorization: Bearer <your_token_here>"
```

**Expected Response (200 OK):**
```json
[
  {
    "id": 1,
    "registrationNumber": "KKX123",
    "licensePlate": "KE123ABC",
    "capacity": 50,
    "year": 2023,
    "make": "Toyota"
  }
]
```

## Using Postman

### 1. Create a Collection
- Open Postman
- Create new collection: "ZanUsafiri Auth"

### 2. Create Login Request
- Method: POST
- URL: `http://localhost:8080/api/auth/login`
- Body (raw JSON):
```json
{
  "username": "admin",
  "password": "password123"
}
```
- Click "Send"
- Copy the token from response

### 3. Set Authorization in Environment Variable
- Click "Environments" → "Create New"
- Name: "ZanUsafiri"
- Add variable:
  - Name: `bearerToken`
  - Value: (paste the token you copied)
- Select this environment

### 4. Create Authenticated Request
- Method: GET
- URL: `http://localhost:8080/api/auth/me`
- Headers tab:
  - Key: `Authorization`
  - Value: `Bearer {{bearerToken}}`
- Click "Send"

### 5. Pre-request Script (Auto-token refresh)
Add to collection:
```javascript
// Get current token
let token = pm.environment.get("bearerToken");

// If token exists, set authorization
if (token) {
    pm.request.headers.add({
        key: "Authorization",
        value: "Bearer " + token
    });
}
```

## Test Validation Errors

### Missing Username
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "password": "password123"
  }'
```

**Response (400 Bad Request):**
```json
{
  "status": 400,
  "message": "username: Username is required; ",
  "error": "Validation Failed",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/auth/login"
}
```

### Password Too Short
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "short"
  }'
```

**Response (400 Bad Request):**
```json
{
  "status": 400,
  "message": "password: Password must be at least 6 characters; ",
  "error": "Validation Failed",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/auth/login"
}
```

## Role-Based Access Control Testing

### Create Test Users
1. Login as admin first
2. Register two users:
   - One with ADMIN role
   - One with STAFF role

### Test Admin-Only Endpoints
```bash
# This should work with ADMIN token
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin_token>" \
  -d '{"username": "newuser", "email": "new@test.com", "password": "pass123", "fullName": "New User", "role": "STAFF"}'

# This should FAIL with STAFF token
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <staff_token>" \
  -d '{"username": "newuser", "email": "new@test.com", "password": "pass123", "fullName": "New User", "role": "STAFF"}'
```

## Database Verification

### Check Users in Database
```bash
# Login to PostgreSQL
psql -U postgres -d zanusafiri

# View users
SELECT id, username, email, role, active FROM users;

# View encrypted password
SELECT username, password FROM users;
```

## Performance Testing

### Measure Token Generation Time
```bash
time curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password123"}'
```

## Security Testing

### Test Expired Token
1. Wait for token to expire (24 hours)
2. Try to use the token
3. Should get: "JWT token is expired"

### Test Malformed Token
```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer malformedtoken123"
```

**Response (401 Unauthorized):**
```json
{
  "status": 401,
  "message": "Invalid JWT token",
  "error": "Authentication Failed",
  "timestamp": "2024-01-15T10:30:00",
  "path": "/api/auth/me"
}
```

### Test Token Tampering
1. Get a valid token
2. Modify one character in the token
3. Try to use it
4. Should get: "JWT signature validation failed"

## Common Test Scenarios

### Scenario 1: Complete User Journey
1. Register new user (as admin)
2. Login with new user credentials
3. Get current user info
4. Logout
5. Try to access protected resource (should fail)

### Scenario 2: Role-Based Access
1. Create ADMIN user
2. Create STAFF user
3. Try admin endpoint with STAFF token (should fail)
4. Try admin endpoint with ADMIN token (should succeed)

### Scenario 3: Token Refresh
1. Login and get token
2. Wait a few seconds
3. Use refresh endpoint to get new token
4. Verify new token works

## Troubleshooting Tests

### Issue: "Connection refused"
- Ensure backend is running: `mvn spring-boot:run`
- Check port 8080 is available

### Issue: "Invalid username or password"
- Ensure database is populated with test data
- Run `DataInitializer` to seed default users
- Default admin: username=`admin`, password=`password123`

### Issue: "JWT signature does not match"
- Ensure JWT secret in application.yml is correct
- Restart backend if config changed
- Clear browser cache/cookies

### Issue: "User not found in database"
- Check UserRepository queries
- Verify database connection
- Check database logs

## Load Testing

### Using Apache Bench
```bash
# Test login endpoint with 100 requests, 10 concurrent
ab -n 100 -c 10 -p login.json -T application/json http://localhost:8080/api/auth/login

# Create login.json file:
{
  "username": "admin",
  "password": "password123"
}
```

### Using JMeter
1. Create test plan
2. Add HTTP Request Sampler for login
3. Add 100 users
4. Ramp-up time: 10 seconds
5. Run test and analyze results
