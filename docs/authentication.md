# Authentication & Session Security Architecture

## 1. Unified Authentication Design

MediBook replaces the fragmented triple-token architecture (`token`, `dtoken`, `atoken`) with an industry-standard, unified JWT authentication system using **Access Tokens** and **Refresh Tokens with Rotation**.

### 1.1 Key Principles
1. **Single Entry Point**: All users—Patients, Doctors, and Admins—authenticate through `/api/v1/auth/login`.
2. **Strict Role Binding**: The user's role (`PATIENT`, `DOCTOR`, `ADMIN`) is validated against PostgreSQL, not spoofable client-side values.
3. **Short-Lived Access Tokens**:
   - Lifetime: 15 minutes.
   - Purpose: Stateless API authorization via standard `Authorization: Bearer <token>` header.
   - Payload: `{ id: user.id, email: user.email, role: user.role }`.
4. **Secure Long-Lived Refresh Tokens**:
   - Lifetime: 7 days.
   - Transport: Stored exclusively in an `httpOnly`, `secure`, `sameSite: 'strict'` cookie. Inaccessible to client JavaScript (immune to XSS).
   - Storage: Cryptographic SHA-256 hash stored in the `refresh_tokens` PostgreSQL table.
   - **Rotation**: Every time a refresh token is used to issue a new access token, the old refresh token is marked revoked and replaced by a new one.
   - **Reuse Detection**: If a revoked refresh token is presented, the system detects potential session hijacking and immediately revokes all active refresh tokens for that user.

---

## 2. Token Lifecycle Diagram

```
Patient/Doctor/Admin                       Server                     Database (PostgreSQL)
        |                                     |                                 |
        |--- 1. POST /api/v1/auth/login ----->|                                 |
        |    (email, password)                |--- Verify bcrypt hash --------->|
        |                                     |<-- User OK ---------------------|
        |                                     |--- Store Refresh Token Hash --->|
        |<-- Set-Cookie: refreshToken --------|                                 |
        |    { accessToken, user }            |                                 |
        |                                     |                                 |
        |--- 2. Authenticated API Request --->|                                 |
        |    Header: Bearer <accessToken>     |--- Verify JWT signature         |
        |                                     |    (Stateless, no DB call)      |
        |<-- 200 OK + Data -------------------|                                 |
        |                                     |                                 |
        |--- 3. Access Token Expires (15m) ->|                                 |
        |                                     |                                 |
        |--- 4. POST /api/v1/auth/refresh --->|                                 |
        |    (Cookie: refreshToken)           |--- Check Hash & Revocation ---->|
        |                                     |--- Revoke Old, Insert New ----->|
        |<-- Set-Cookie: newRefreshToken -----|                                 |
        |    { accessToken: newAccessToken }  |                                 |
        |                                     |                                 |
        |--- 5. POST /api/v1/auth/logout ---->|                                 |
        |    (Cookie: refreshToken)           |--- Revoke Token in DB --------->|
        |<-- Clear-Cookie: refreshToken ------|                                 |
```

---

## 3. Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Authenticate patient, doctor, or admin. Returns access token + sets HTTP-only refresh cookie. |
| `POST` | `/api/v1/auth/register` | Register new user; dispatches OTP to email. |
| `POST` | `/api/v1/auth/verify-otp` | Verifies 6-digit OTP and creates confirmed account with active session. |
| `POST` | `/api/v1/auth/refresh` | Issues a new access token and rotates the refresh token cookie. |
| `POST` | `/api/v1/auth/logout` | Revokes the current session refresh token and clears cookie. |
| `POST` | `/api/v1/auth/logout-all` | Revokes all refresh tokens for the authenticated user across all devices. |
| `POST` | `/api/v1/auth/forgot-password`| Sends a 6-digit password reset OTP to user email. |
| `POST` | `/api/v1/auth/reset-password` | Verifies OTP and updates password hash safely in database. |
| `GET`  | `/api/v1/auth/me` | Fetches currently authenticated user identity and role. |

---

## 4. Password Security
- Passwords are never stored in plaintext.
- Hashing algorithm: **bcrypt** with standard 10 salt rounds.
- Strong password enforcement: Minimum 8 characters, requiring mixed alphanumeric characters checked at the API validation layer.
