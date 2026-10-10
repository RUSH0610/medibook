# MediBook Backend Architecture, Functions & Workflow Catalog

This document provides a comprehensive technical reference for all backend functions, API controllers, services, database helpers, middlewares, and end-to-end execution steps across the MediBook system.

---

## Table of Contents

1. [System Overview & Entry Point](#1-system-overview--entry-point)
2. [Database Layer (`backend/src/db/`)](#2-database-layer-backendsrcdb)
3. [Authentication & Session Management (`auth.controller.js`)](#3-authentication--session-management-authcontrollerjs)
4. [Appointment Scheduling Engine (`appointment.service.js` & `appointment.controller.js`)](#4-appointment-scheduling-engine-appointmentservicejs--appointmentcontrollerjs)
5. [Doctor Management & Dashboards (`doctor.controller.js`)](#5-doctor-management--dashboards-doctorcontrollerjs)
6. [Admin Platform Control (`admin.controller.js`)](#6-admin-platform-control-admincontrollerjs)
7. [Clinical Prescriptions (`prescriptionController.js`)](#7-clinical-prescriptions-prescriptioncontrollerjs)
8. [Electronic Health Records (`medicalRecordController.js`)](#8-electronic-health-records-medicalrecordcontrollerjs)
9. [Patient Feedback & Ratings (`reviewController.js`)](#9-patient-feedback--ratings-reviewcontrollerjs)
10. [In-App Notifications (`notification.service.js` & `notificationController.js`)](#10-in-app-notifications-notificationservicejs--notificationcontrollerjs)
11. [AI Symptom Triage (`ai.controller.js` & `symptomTriage.service.js`)](#11-ai-symptom-triage-aicontrollerjs--symptomtriageservicejs)
12. [Middlewares & Utility Functions](#12-middlewares--utility-functions)
13. [End-to-End Workflow Step-by-Step Executions](#13-end-to-end-workflow-step-by-step-executions)

---

## 1. System Overview & Entry Point

### File: `server.js`
The server initialization module manages startup lifecycle operations in 4 distinct steps:

1. **`testConnection()`**: Executes `SELECT NOW(), current_database()` to verify PostgreSQL availability.
2. **Migrations**: `npm start` runs `npm run db:migrate` first (Drizzle migrations in `src/db/migrations`).
3. **`seedDatabase()`**: Populates initial specializations, default admin, sample doctors, and patient accounts if missing.
4. **`connectCloudinary()`**: Configures Cloudinary API credentials for file/image streaming.
5. **`app.listen(PORT)`**: Launches Express HTTP server listening on the configured `PORT` (default 4000).

---

## 2. Database Layer (`backend/src/db/`)

### File: `backend/src/db/index.js`
Provides PostgreSQL connection pooling and transaction wrappers built on `pg.Pool`.

| Function | Signature / Parameters | Description & Steps |
|---|---|---|
| **`query`** | `query(text, params)` | Executes a parameterized SQL query on an idle connection from the pool. Returns a `pg.QueryResult`. |
| **`getClient`** | `getClient()` | Returns a single `pg.PoolClient` connection from the pool for manual multi-statement operations. |
| **`withTransaction`** | `withTransaction(callback, isolationLevel = "READ COMMITTED")` | Wraps a set of operations in an ACID transaction: <br>1. Connects a client via `pool.connect()`. <br>2. Executes `BEGIN TRANSACTION ISOLATION LEVEL <level>`. <br>3. Runs `callback(client)`. <br>4. Calls `COMMIT` on success. <br>5. Calls `ROLLBACK` on any thrown error and releases client. |
| **`testConnection`** | `testConnection()` | Health check query validating database connection and returning database name. |

---

## 3. Authentication & Session Management (`auth.controller.js`)

Handles identity, bcrypt password hashing, 6-digit OTP email delivery, and JWT Refresh Token Rotation.

```
       [ Client ]                        [ Server / DB ]
           │                                   │
           │── 1. POST /auth/register ────────►│ Insert OTP record, Send Email
           │                                   │
           │── 2. POST /auth/verify-otp ──────►│ withTransaction: Create User+Patient
           │                                   │ Issue Access (15m) + Refresh (7d)
           │                                   │
           │── 3. POST /auth/refresh ─────────►│ Validate token hash, Revoke old token,
                                               │ Issue rotated new Refresh Token
```

| Controller Function | Description & Execution Steps |
|---|---|
| **`register(req, res)`** | **Step 1: Patient Registration Request** <br>1. Validates `name`, `email`, `password`. <br>2. Checks if email exists in `users`. <br>3. Hashes password with bcrypt (cost factor 10). <br>4. Generates a 6-digit OTP (`Math.floor(100000 + Math.random() * 900000)`). <br>5. Stores OTP in `otps` table with 10-minute expiry. <br>6. Sends email via Nodemailer `sendOTPEmail()`. |
| **`verifyOTP(req, res)`** | **Step 2: OTP Verification & Account Creation** <br>1. Queries latest non-expired `otps` record for `email`. <br>2. Compares submitted OTP code with record. <br>3. Inside `withTransaction`: <br>&nbsp;&nbsp;a. Inserts row into `users` (`role = 'PATIENT'`). <br>&nbsp;&nbsp;b. Inserts row into `patients` linked by `user_id`. <br>&nbsp;&nbsp;c. Deletes registration OTPs for email. <br>4. Generates Access Token + Refresh Token and sets HTTP-only cookie. |
| **`login(req, res)`** | **Universal Login (Patient, Doctor, Admin)** <br>1. Fetches user by `email` from `users`. <br>2. Verifies account `is_active === true`. <br>3. Compares password via `bcrypt.compare`. <br>4. Fetches role-specific profile ID (`patientId` or `doctorId`). <br>5. Generates Access Token (15m) and Refresh Token (7d). <br>6. Stores SHA-256 hash of refresh token in `refresh_tokens`. <br>7. Sets HTTP-only cookie and returns user profile. |
| **`refresh(req, res)`** | **Refresh Token Rotation & Theft Detection** <br>1. Reads refresh token from HTTP-only cookie or request body. <br>2. Hashes token with SHA-256 and queries `refresh_tokens`. <br>3. **Reuse Detection**: If `is_revoked === true`, assumes session hijacking, revokes **ALL** tokens for user (`UPDATE refresh_tokens SET is_revoked = true`), clears cookie, and throws `401 SESSION_HIJACK_DETECTED`. <br>4. Verifies expiration date (`expires_at > NOW()`). <br>5. Inside `withTransaction`: Revokes used token and issues a newly generated rotated refresh token. <br>6. Returns new 15-minute Access Token. |
| **`logout(req, res)`** | Revokes current refresh token by setting `is_revoked = true` in `refresh_tokens` and clears HTTP-only cookie. |
| **`logoutAll(req, res)`** | Global Logout: Revokes all active refresh tokens for `req.user.id` across all devices. |
| **`forgotPassword(req, res)`** | Generates a 6-digit password reset OTP and emails it to the user. Returns constant response to prevent email enumeration. |
| **`resetPassword(req, res)`** | Verifies `PASSWORD_RESET` OTP, hashes new password, updates `users.password_hash`, revokes all active refresh tokens, and deletes used OTP. |
| **`getMe(req, res)`** | Returns current user identity and nested role data (`patientData` or `doctorData`). |

---

## 4. Appointment Scheduling Engine (`appointment.service.js` & `appointment.controller.js`)

Guarantees serial consistency and zero double bookings under heavy concurrent traffic.

```
       Patient A Booking                       Patient B Booking
             │                                       │
             ▼                                       ▼
 ┌──────────────────────────────────────────────────────────────────────┐
 │                  withTransaction(async (client) => {                 │
 │  1. SELECT * FROM doctors WHERE id = $1 FOR UPDATE                   │  <-- Pessimistic Lock
 │  2. SELECT * FROM appointments WHERE slot active                     │
 │  3. INSERT INTO appointments (...)                                   │
 │  })                                                                  │
 └──────────────────────────────────────────────────────────────────────┘
             │                                       │
     Success: Commit                        Failure: SQL 23505
                                           Returns 409 SLOT_UNAVAILABLE
```

### Services (`appointment.service.js`)

| Service Function | Parameters | Description & Steps |
|---|---|---|
| **`formatDateStr`** | `dateObj` | Formats a JavaScript Date object into string `YYYY-MM-DD`. |
| **`addMinutesToTime`** | `timeStr, minutes` | Calculates new `HH:mm` time string after adding $N$ minutes. |
| **`normalizeTimeTo24h`** | `timeStr` | Converts formats like `"10:00 AM"`, `"01:30 PM"`, or `"14:00"` to 24-hour `"HH:mm"`. |
| **`getDoctorSlotsForDate`**| `doctorId, dateStr` | **Dynamic Slot Generation Engine**: <br>1. Checks day of week (`Sunday`-`Saturday`). <br>2. Queries `doctor_availability` rule for doctor and day. Defaults to 09:00-17:00 if unconfigured. <br>3. Checks `doctor_leave_blocks` for date. If full-day leave, returns empty slots. <br>4. Queries active appointments (`status NOT IN ('CANCELLED')`). <br>5. Loops from `start_time` to `end_time` by `slot_duration_minutes`. <br>6. Marks `available = false` if slot is in past, booked, or during leave block. |
| **`bookAppointmentSafe`** | `{ patientUserId, doctorId, appointmentDate, startTime, appointmentType, reason, notes, phone }` | **Concurrency-Safe Booking**: <br>1. Resolves patient record from `patientUserId`. <br>2. Validates appointment date is not in past. <br>3. Validates slot using `getDoctorSlotsForDate()`. <br>4. Runs inside `withTransaction`: <br>&nbsp;&nbsp;a. Locks doctor row: `SELECT ... FROM doctors WHERE id = $1 FOR UPDATE`. <br>&nbsp;&nbsp;b. Re-checks existing active appointment. <br>&nbsp;&nbsp;c. Inserts appointment (`status = 'CONFIRMED'`). <br>5. Triggers domain notification (`notifyAppointmentBooked`). <br>6. Catches SQL constraint code `23505` (`uq_active_doctor_slot`) and formats standard `409 SLOT_UNAVAILABLE` error. |
| **`rescheduleAppointmentSafe`**| `{ appointmentId, patientUserId, newDate, newStartTime }` | **Atomic Reschedule**: <br>1. Verifies patient ownership and appointment status (`CONFIRMED`/`PENDING`). <br>2. Validates target slot availability. <br>3. Inside `withTransaction`: Re-checks collision and executes `UPDATE appointments SET appointment_date = $1, start_time = $2, end_time = $3`. <br>4. Triggers `notifyAppointmentRescheduled()`. |
| **`cancelAppointmentSafe`** | `{ appointmentId, user }` | **Slot Release**: <br>1. Validates caller authorization (Patient owner, Doctor owner, or Admin). <br>2. Rejects if appointment is `COMPLETED` or `CANCELLED`. <br>3. Updates `status = 'CANCELLED'`. Instantly releases slot from partial index `WHERE status NOT IN ('CANCELLED')`. <br>4. Triggers `notifyAppointmentCancelled()`. |

### Controllers (`appointment.controller.js`)

* **`bookAppointment(req, res)`**: Parses body parameters, normalizes date/time strings, and calls `bookAppointmentSafe()`. Returns `201 Created`.
* **`getMyAppointments(req, res)`**: Retrieves all appointments for authenticated patient with doctor details and review rating.
* **`getDoctorAppointments(req, res)`**: Retrieves assigned appointments for doctor panel with patient demographic info.
* **`rescheduleAppointment(req, res)`**: Parses request and executes `rescheduleAppointmentSafe()`.
* **`cancelAppointment(req, res)`**: Validates appointment ID and calls `cancelAppointmentSafe()`.
* **`completeAppointment(req, res)`**: Doctor-only endpoint. Updates status to `COMPLETED` and sends completed notification.

---

## 5. Doctor Management & Dashboards (`doctor.controller.js`)

| Controller Function | Description & Execution Steps |
|---|---|
| **`getDoctors(req, res)`** | Returns all approved (`is_approved = true`) doctors filtered by optional `speciality` string, joining `users` and `specializations`. |
| **`getDoctorById(req, res)`** | Returns detailed profile, specialization, qualifications, address, and ratings for doctor ID. |
| **`getDoctorAvailability(req, res)`** | Calculates dynamic slot availability for doctor on requested `?date=YYYY-MM-DD` using `getDoctorSlotsForDate()`. |
| **`updateDoctorProfile(req, res)`** | Updates doctor fee, qualification, experience, hospital affiliation, room, bio, and address in `doctors` table. |
| **`updateDoctorAvailability(req, res)`** | Upserts doctor weekly schedule in `doctor_availability` table with `ON CONFLICT (doctor_id, day_of_week) DO UPDATE`. |
| **`addDoctorLeave(req, res)`** | Inserts a leave block in `doctor_leave_blocks`. |
| **`getDoctorLeaves(req, res)`** | Lists upcoming leave blocks for the logged-in doctor. |
| **`deleteDoctorLeave(req, res)`** | Deletes a leave block by ID. |
| **`getDoctorDashboard(req, res)`** | Computes doctor dashboard metrics (total earnings, total appointments, unique patients, latest 5 appointments). |

---

## 6. Admin Platform Control (`admin.controller.js`)

| Controller Function | Description & Execution Steps |
|---|---|
| **`addDoctor(req, res)`** | **Admin Doctor Onboarding**: <br>1. Parses doctor details and binary image. <br>2. Streams avatar to Cloudinary folder `doctors`. <br>3. Inside `withTransaction`: Creates user with `role = 'DOCTOR'` and inserts linked `doctors` record. |
| **`getAllDoctors(req, res)`** | Retrieves all doctors across platform (approved and unapproved) for admin grid. |
| **`toggleDoctorApproval(req, res)`** | Approves or suspends a doctor account (`is_approved = NOT is_approved`). |
| **`getAllUsers(req, res)`** | Retrieves all registered patients and doctors with account statuses. |
| **`toggleUserStatus(req, res)`** | Deactivates or activates a user (`is_active = NOT is_active`). |
| **`getAllAppointmentsAdmin(req, res)`**| Fetches global list of appointments with patient and doctor details. |
| **`cancelAppointmentAdmin(req, res)`**| Admin force-cancellation of any active appointment. |
| **`getAdminDashboard(req, res)`** | Computes platform metrics (total doctors, total patients, total appointments, revenue breakdown, recent bookings). |

---

## 7. Clinical Prescriptions (`prescriptionController.js`)

| Controller Function | Description & Execution Steps |
|---|---|
| **`createPrescription(req, res)`** | **Issue Prescription**: <br>1. Verifies doctor ownership and `COMPLETED` appointment status. <br>2. Inside `withTransaction`: <br>&nbsp;&nbsp;a. Inserts prescription header into `prescriptions`. <br>&nbsp;&nbsp;b. Bulk inserts medicines into `prescription_items`. <br>3. Sends prescription ready notification to patient. |
| **`getPrescriptionByAppointment`**| Fetches prescription details and medicine items by `appointmentId`. |
| **`getPatientPrescriptions`** | Fetches all prescriptions for logged-in patient sorted by date. |
| **`getDoctorPrescriptions`** | Fetches all prescriptions issued by logged-in doctor. |

---

## 8. Electronic Health Records (`medicalRecordController.js`)

| Controller Function | Description & Execution Steps |
|---|---|
| **`uploadMedicalRecord(req, res)`**| **Upload EHR File**: <br>1. Receives file buffer via Multer. <br>2. Streams upload to Cloudinary `medical_records` folder. <br>3. Inserts metadata into `medical_records` with `cloudinary_public_id`. |
| **`getPatientRecords(req, res)`** | Retrieves medical records owned by logged-in patient. |
| **`getDoctorSharedRecords(req, res)`**| Queries records where doctor ID is in `shared_with_doctors` array. |
| **`shareRecordWithDoctor(req, res)`**| Appends `doctorId` to `shared_with_doctors` array in `medical_records`. |
| **`deleteMedicalRecord(req, res)`**| Deletes record metadata from database and cleans up asset on Cloudinary via `cloudinary.uploader.destroy()`. |

---

## 9. Patient Feedback & Ratings (`reviewController.js`)

| Controller Function | Description & Execution Steps |
|---|---|
| **`submitReview(req, res)`** | **Submit Review**: <br>1. Verifies patient ownership of completed appointment. <br>2. Inside `withTransaction`: <br>&nbsp;&nbsp;a. Inserts review into `reviews`. <br>&nbsp;&nbsp;b. Re-aggregates doctor `avg_rating` and `total_reviews` and updates `doctors` row. |
| **`getDoctorReviews(req, res)`** | Returns approved public reviews for doctor (`is_approved = true`). |
| **`getAllReviews(req, res)`** | Admin listing of all reviews. |
| **`toggleReviewApproval(req, res)`**| Admin toggle to hide or approve public review, recalculating rating stats. |

---

## 10. In-App Notifications (`notification.service.js` & `notificationController.js`)

### Services (`notification.service.js`)
* **`createNotification({ userId, type, title, message, relatedId, link })`**: Inserts in-app alert into `notifications` table.
* **`notifyAppointmentBooked(appt, patient, doctor)`**: Sends confirmation alert to patient and booking request alert to doctor.
* **`notifyAppointmentRescheduled(appt, patient, doctor)`**: Sends rescheduling alert to patient and doctor.
* **`notifyAppointmentCancelled(appt, patient, doctor, cancelledByRole)`**: Sends cancellation alert detailing who cancelled.
* **`notifyAppointmentCompleted(appt, patient, doctor)`**: Sends completion alert prompting patient review.

### Controllers (`notificationController.js`)
* **`getNotifications(req, res)`**: Returns notifications for logged-in user with unread count.
* **`markNotificationRead(req, res)`**: Sets `is_read = true` for single notification ID.
* **`markAllNotificationsRead(req, res)`**: Sets `is_read = true` for all unread notifications of user.

---

## 11. AI Symptom Triage (`ai.controller.js` & `symptomTriage.service.js`)

| Module / Function | Description & Execution Steps |
|---|---|
| **`triageSymptomsWithAI(symptomsText)`** | 1. Fetches available specialties from `specializations`. <br>2. Constructs prompt `SYMPTOM_TRIAGE_V1`. <br>3. Calls Groq API (`llama-3.3-70b-versatile`) with temperature 0.2. <br>4. Cleans response string, parses JSON, validates schema. <br>5. Matches suggested specialty against `specializations` table. |
| **`triageSymptoms(req, res)`** | Controller wrapper returning structured triage response (`symptoms`, `suggestedSpecialty`, `urgency`, `reason`, `matchedDoctors`). |

---

## 12. Middlewares & Utility Functions

* **`authenticate` (`auth.middleware.js`)**: Extracts JWT from `Authorization: Bearer <token>` or custom headers. Verifies token payload and attaches user to `req.user`.
* **`authorize(...roles)`**: Role-based guard enforcing allowed user roles (`PATIENT`, `DOCTOR`, `ADMIN`).
* **`asyncHandler` (`asyncHandler.js`)**: Higher-order function wrapping async route handlers to catch exceptions and forward to global error handler.
* **`ApiError` (`ApiError.js`)**: Standardized error class with HTTP status code, message, error array, and operational error codes.
* **`ApiResponse` (`ApiResponse.js`)**: Standardized HTTP response payload `{ statusCode, data, message, success }`.

---

## 13. End-to-End Workflow Step-by-Step Executions

### Workflow A: Complete Appointment Lifecycle

```
[Patient]                                  [System / DB]                                   [Doctor]
   │                                             │                                            │
   │── 1. GET /doctors/:id/availability ────────►│ Computes dynamic slots                     │
   │                                             │ (Checks rules, leave blocks, appts)        │
   │                                             │                                            │
   │── 2. POST /appointments/book ──────────────►│ withTransaction:                           │
   │                                             │ Lock Doctor row (SELECT FOR UPDATE)        │
   │                                             │ INSERT INTO appointments                   │
   │                                             │ (Enforces uq_active_doctor_slot)           │
   │                                             │                                            │
   │                                             │◄── Triggers Notification ──────────────────│
   │                                             │                                            │
   │                                             │◄── 3. POST /appointments/:id/complete ─────│
   │                                             │ Updates status = 'COMPLETED'               │
   │                                             │                                            │
   │                                             │◄── 4. POST /prescriptions ─────────────────│
   │                                             │ Inserts Header + Medicine Items            │
   │                                             │                                            │
   │── 5. POST /reviews ────────────────────────►│ Inserts Review                             │
   │                                             │ Recalculates Doctor avg_rating & reviews   │
```

---

### Summary Table of All Backend Modules

| Module Path | Primary Responsibility | Key Exported Functions |
|---|---|---|
| `src/db/index.js` | PostgreSQL Pool & Transactions | `query`, `withTransaction`, `getClient`, `testConnection` |
| `src/controllers/auth.controller.js` | Identity, Auth & Tokens | `register`, `verifyOTP`, `login`, `refresh`, `logout`, `logoutAll` |
| `src/services/appointment.service.js` | Dynamic Slots & Safe Booking | `getDoctorSlotsForDate`, `bookAppointmentSafe`, `rescheduleAppointmentSafe` |
| `src/controllers/appointment.controller.js` | Scheduling Routes | `bookAppointment`, `getMyAppointments`, `rescheduleAppointment`, `cancelAppointment` |
| `src/controllers/doctor.controller.js` | Doctor Profiles & Schedules | `getDoctors`, `getDoctorById`, `updateDoctorAvailability`, `addDoctorLeave` |
| `src/controllers/admin.controller.js` | Admin Operations & Stats | `addDoctor`, `toggleDoctorApproval`, `toggleUserStatus`, `getAdminDashboard` |
| `src/controllers/prescriptionController.js` | Prescriptions | `createPrescription`, `getPrescriptionByAppointment`, `getPatientPrescriptions` |
| `src/controllers/medicalRecordController.js` | Electronic Health Records | `uploadMedicalRecord`, `getPatientRecords`, `shareRecordWithDoctor`, `deleteMedicalRecord` |
| `src/controllers/reviewController.js` | Ratings & Feedback | `submitReview`, `getDoctorReviews`, `toggleReviewApproval` |
| `src/services/notification.service.js` | Domain In-App Alerts | `createNotification`, `notifyAppointmentBooked`, `notifyAppointmentCompleted` |
| `src/services/ai/symptomTriage.service.js` | AI Symptom Navigation | `triageSymptomsWithAI` |
