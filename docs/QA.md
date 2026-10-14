# MediBook — Complete Question & Answer Reference

> **Covers:** Project Overview · Tech Stack · Authentication · Appointments · Doctors · Patients · Admin · Prescriptions · Medical Records · Reviews · Notifications · AI Triage · Database · Security · API Design · Error Handling · Setup · Architecture

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Setup & Environment](#3-setup--environment)
4. [Authentication & Security](#4-authentication--security)
5. [User Roles & Authorization](#5-user-roles--authorization)
6. [Patient Features](#6-patient-features)
7. [Doctor Features](#7-doctor-features)
8. [Admin Features](#8-admin-features)
9. [Appointment Scheduling & Concurrency](#9-appointment-scheduling--concurrency)
10. [Prescriptions](#10-prescriptions)
11. [Medical Records](#11-medical-records)
12. [Reviews & Ratings](#12-reviews--ratings)
13. [Notifications](#13-notifications)
14. [AI Symptom Triage](#14-ai-symptom-triage)
15. [Database Design](#15-database-design)
16. [API Design & Conventions](#16-api-design--conventions)
17. [Middleware & Utilities](#17-middleware--utilities)
18. [Error Handling](#18-error-handling)
19. [Performance & Indexing](#19-performance--indexing)
20. [Project Architecture & File Structure](#20-project-architecture--file-structure)

---

## 1. Project Overview

**Q1. What is MediBook?**
> MediBook is a full-stack healthcare appointment booking platform. It provides role-based workflows for three types of users — Patients, Doctors, and Administrators — covering appointment booking, prescriptions, medical records, AI-based symptom triage, reviews, and notifications.

**Q2. Where is the live demo?**
> The live demo is available at **https://medibook-fcwr.vercel.app**

**Q3. What are the three main user roles in MediBook?**
> 1. **Patient** – Books appointments, views prescriptions, manages medical records, and uses AI symptom triage.
> 2. **Doctor** – Manages availability, completes appointments, issues digital prescriptions, and views patient records.
> 3. **Administrator** – Manages platform-wide operations: adding doctors, approvals, platform metrics, and appointment oversight.

**Q4. What types of consultations can patients book?**
> Patients can book three types:
> - `in-person` — Physical hospital visit
> - `video` — Video call consultation
> - `phone` — Phone call consultation

**Q5. What is the main URL prefix for all backend API calls?**
> All API endpoints are prefixed with `/api/v1`.

---

## 2. Tech Stack

**Q6. What frontend framework does MediBook use?**
> React 18, bundled with Vite, styled with Tailwind CSS, and using React Router v6 for client-side routing. HTTP requests are made via Axios.

**Q7. What is the backend built with?**
> Node.js with Express.js, organized using a Feature Modules architecture. The backend uses ES Modules syntax (`import/export`).

**Q8. What database does MediBook use?**
> PostgreSQL (v14+). The ORM is **Drizzle ORM** with Drizzle Kit for schema management and migrations.

**Q9. Why was PostgreSQL chosen over MongoDB?**
> MediBook originally used MongoDB. PostgreSQL was chosen for:
> - **ACID Transactions**: Required for booking operations, prescriptions, and financial values.
> - **Data Integrity**: Foreign keys eliminate orphaned or stale records.
> - **Race Condition Prevention**: Database-level unique constraints and `SELECT FOR UPDATE` row locking prevent double-booking.
> - **High-performance indexes**: Composite and partial indexes support complex healthcare queries.
> - **Normalization (3NF)**: Prevents data duplication anomalies that existed in MongoDB embedded documents.

**Q10. What is used for file and image storage?**
> **Cloudinary** handles both doctor profile photos (uploaded by Admin) and patient medical record documents.

**Q11. What AI service powers the symptom triage feature?**
> **Groq API** running the **`llama-3.3-70b-versatile`** model with a temperature of 0.2.

**Q12. How are passwords stored?**
> Passwords are **never stored in plaintext**. They are hashed with **bcrypt** using 10 salt rounds before being saved to the `users` table.

**Q13. What handles authentication tokens?**
> **JWT (JSON Web Tokens)** — short-lived Access Tokens (15 minutes) and long-lived Refresh Tokens (7 days) with automatic rotation.

---

## 3. Setup & Environment

**Q14. What are the prerequisites to run MediBook locally?**
> - Node.js 18+
> - PostgreSQL 14+
> - Cloudinary account (optional for media uploads)

**Q15. How do you clone and install dependencies?**
> ```bash
> git clone https://github.com/RUSH0610/medibook.git
> cd medibook
> cd backend && npm install
> cd ../frontend && npm install
> ```

**Q16. What environment variables are required for the backend?**
> Create `backend/.env` with:
> ```env
> PORT=4000
> FRONTEND_URL=http://localhost:5173
> PG_HOST=127.0.0.1
> PG_PORT=5432
> PG_USER=postgres
> PG_PASSWORD=your_password
> PG_DATABASE=medibook
> DATABASE_URL=postgresql://postgres:your_password@127.0.0.1:5432/medibook
> JWT_SECRET=your_jwt_secret_key
> ADMIN_EMAIL=admin@medibook.com
> ADMIN_PASSWORD=admin123456
> CLOUDINARY_NAME=your_cloudinary_cloud_name
> CLOUDINARY_API_KEY=your_cloudinary_api_key
> CLOUDINARY_SECRET_KEY=your_cloudinary_secret
> GROQ_API_KEY=your_groq_api_key
> ```

**Q17. What environment variable does the frontend need?**
> Create `frontend/.env`:
> ```env
> VITE_BACKEND_URL=http://localhost:4000
> ```

**Q18. How do you initialize the database schema?**
> ```bash
> cd backend
> npm run db:push   # Synchronize schema with PostgreSQL
> npm run db:seed   # Seed base data (specializations + admin user)
> ```

**Q19. How do you run the backend and frontend servers?**
> ```bash
> # Backend (port 4000)
> cd backend && npm run dev
>
> # Frontend (port 3000 / 5173)
> cd frontend && npm run dev
> ```

**Q20. What does `server.js` do on startup?**
> It performs three steps:
> 1. **`testConnection()`** — Runs `SELECT NOW(), current_database()` to verify PostgreSQL is reachable.
> 2. **`connectCloudinary()`** — Configures Cloudinary SDK credentials.
> 3. **`app.listen(PORT)`** — Starts the Express HTTP server on the configured `PORT` (default 4000).

---

## 4. Authentication & Security

**Q21. What type of authentication system does MediBook use?**
> A unified, industry-standard JWT system with **Access Tokens + Refresh Tokens with Rotation**. All roles (Patient, Doctor, Admin) share the same login endpoint.

**Q22. How long does an Access Token last?**
> **15 minutes**. It is a stateless JWT verified by signature alone (no database lookup required per request).

**Q23. How long does a Refresh Token last?**
> **7 days**.

**Q24. Where is the Refresh Token stored on the client?**
> In an **HTTP-only, secure, `sameSite: 'strict'` cookie**. It is inaccessible to client JavaScript, making it immune to XSS attacks.

**Q25. How is the Refresh Token stored in the database?**
> Only a **SHA-256 cryptographic hash** of the refresh token is stored in the `refresh_tokens` table — never the raw token itself.

**Q26. What is Refresh Token Rotation?**
> Every time a refresh token is used to obtain a new access token, the old refresh token is **revoked** and a brand-new refresh token is issued and set as a cookie.

**Q27. What happens if a revoked Refresh Token is reused?**
> This triggers **Session Hijack Detection**. The system immediately **revokes ALL active refresh tokens** for that user across all devices, clears the cookie, and returns a `401 SESSION_HIJACK_DETECTED` error.

**Q28. What is the payload of the Access Token?**
> `{ id: user.id, email: user.email, role: user.role }`

**Q29. What is the registration flow for new patients?**
> 1. `POST /api/v1/auth/register` — Validates name, email, password. Hashes password with bcrypt. Generates a 6-digit OTP. Saves OTP in `otps` table with a 10-minute expiry. Sends OTP via email.
> 2. `POST /api/v1/auth/verify-otp` — Validates OTP. Inside a transaction, creates the `users` row and the linked `patients` row, then deletes the OTP. Issues Access + Refresh Tokens.

**Q30. How does login work for all roles?**
> `POST /api/v1/auth/login`:
> 1. Fetches user by `email`.
> 2. Verifies `is_active === true`.
> 3. Compares password with `bcrypt.compare`.
> 4. Fetches role-specific profile ID.
> 5. Generates Access Token (15m) + Refresh Token (7d).
> 6. Stores SHA-256 hash of refresh token in `refresh_tokens`.
> 7. Returns user profile + Access Token. Sets HTTP-only refresh cookie.

**Q31. How does password reset work?**
> 1. `POST /auth/forgot-password` — Generates a 6-digit OTP and emails it to the user.
> 2. `POST /auth/reset-password` — Verifies the OTP, hashes the new password, updates `users.password_hash`, revokes all active refresh tokens, and deletes the used OTP.

**Q32. What happens on logout?**
> `POST /auth/logout` — Sets `is_revoked = true` for the current refresh token and clears the HTTP-only cookie.

**Q33. What is `logout-all`?**
> `POST /auth/logout-all` — Revokes **all** active refresh tokens for the authenticated user across every device.

**Q34. What is the rate limit on authentication endpoints?**
> Auth endpoints (`/register`, `/login`, `/forgot-password`) use an in-memory sliding-window limiter: **5 requests per 15 minutes per IP**. OTP verification allows **5 wrong guesses** before the OTP is invalidated and a `429` is returned.

**Q35. What is the minimum password strength requirement?**
> Minimum **8 characters** with mixed alphanumeric characters, enforced at the API validation layer.

---

## 5. User Roles & Authorization

**Q36. What are the valid user roles?**
> `PATIENT`, `DOCTOR`, `ADMIN` — defined in the `users.role` column with a CHECK constraint.

**Q37. How does role-based access control work?**
> The `authorize(...roles)` middleware in `auth.middleware.js` checks `req.user.role` against the allowed roles for each route. Invalid roles receive `403 Forbidden`.

**Q38. Which routes are public (no authentication needed)?**
> - `GET /doctors` — Browse all approved doctors
> - `GET /doctors/specializations` — List all medical specialties
> - `GET /doctors/:id` — View doctor profile
> - `GET /doctors/:id/availability` — View available slots
> - `GET /reviews/doctor/:docId` — View doctor reviews
> - `POST /auth/register`, `POST /auth/login`, `POST /auth/verify-otp`, `POST /auth/forgot-password`, `POST /auth/reset-password`

**Q39. How does the middleware attach the doctor's internal ID to the request?**
> The `requireDoctor` middleware resolves `req.doctorId` from the authenticated `req.user.id` by querying the `doctors` table, so that Doctor-specific controllers can use it directly.

---

## 6. Patient Features

**Q40. What can a Patient do in MediBook?**
> - Register with OTP email verification
> - Log in and manage their personal profile (blood group, DOB, insurance, emergency contacts, allergies, medications)
> - Browse and filter doctors by specialization
> - Book appointments (in-person, video, phone) with slot conflict protection
> - Reschedule or cancel existing appointments
> - Access digital prescriptions issued by doctors
> - Upload medical records (PDFs, scans) and share them securely with doctors
> - Use AI-powered symptom triage to identify the right specialist
> - Receive in-app notifications
> - Submit reviews and ratings for completed appointments

**Q41. What profile fields can a Patient update?**
> Date of birth, gender, blood group, insurance provider & policy number, emergency contact (name, phone, relation), allergies, chronic conditions, current medications, past surgeries, and address (stored as JSONB).

**Q42. How does a Patient view their prescriptions?**
> `GET /api/v1/prescriptions/my` — Returns all prescriptions sorted by date. Each prescription includes all medicine items (dosage, frequency, duration, instructions).

---

## 7. Doctor Features

**Q43. What can a Doctor do in MediBook?**
> - View their dashboard (total earnings, total appointments, unique patients, latest appointments)
> - Manage weekly recurring availability schedule (days, start time, end time, slot duration)
> - Block leave dates (full-day or partial)
> - View patient appointments with demographic info
> - Mark appointments as `COMPLETED`
> - Issue digital prescriptions with medicine items
> - View patient medical records shared for consultations
> - Toggle their availability status on/off

**Q44. How does a Doctor set their weekly schedule?**
> `PUT /api/v1/doctors/me/profile` combined with `PUT /api/v1/doctors/me/availability` — Updates `doctor_availability` using an **UPSERT** (`ON CONFLICT (doctor_id, day_of_week) DO UPDATE`), ensuring only one rule exists per weekday.

**Q45. How does a Doctor block a leave date?**
> `POST /api/v1/doctors/me/leaves` — Inserts a record into `doctor_leave_blocks`. The leave can be full-day (`is_full_day = true`) or partial (with `start_time` and `end_time`).

**Q46. How does the Doctor dashboard compute analytics?**
> `getDoctorDashboard` queries: total earnings (sum of `amount` from `COMPLETED` appointments), total appointment counts, unique patient count (`DISTINCT patient_id`), and the latest 5 appointments with patient details.

---

## 8. Admin Features

**Q47. What can an Administrator do in MediBook?**
> - View platform-wide dashboard metrics (total doctors, patients, appointments, revenue)
> - Add new doctors with photo upload via Cloudinary
> - Approve or suspend doctor accounts
> - Activate or deactivate any user account
> - View all appointments system-wide and force-cancel any
> - Manage and approve/reject patient reviews

**Q48. How does an Admin add a new doctor?**
> `POST /api/v1/admin/doctors`:
> 1. Parses doctor details and the binary image file.
> 2. Streams the avatar to Cloudinary under the `doctors` folder.
> 3. Inside a `withTransaction`: Creates a `users` row with `role = 'DOCTOR'` and inserts the linked `doctors` record.

**Q49. How does Admin approve or suspend a doctor?**
> `PUT /api/v1/admin/doctors/:id/approval` — Toggles `is_approved = NOT is_approved` on the `doctors` row.

**Q50. How does Admin enable or disable a user account?**
> `PUT /api/v1/admin/users/:id/status` — Toggles `is_active = NOT is_active` on the `users` row.

**Q51. What metrics does the Admin Dashboard show?**
> Total registered doctors, total registered patients, total appointments (breakdown by status), total revenue (sum of completed appointment fees), and recent bookings (latest N appointments with patient and doctor info).

---

## 9. Appointment Scheduling & Concurrency

**Q52. What was the race condition problem in the original MongoDB implementation?**
> Two simultaneous booking requests could both read the doctor document, both see the slot as free, and both successfully write — resulting in **double booking**. Cancellation was worse: it read the entire `slots_booked` array into Node.js memory, filtered it, and wrote it back, silently wiping out any booking made between the read and write.

**Q53. How does MediBook prevent double booking in PostgreSQL?**
> Using a **Defense in Depth** multi-layer strategy:
> 1. **Application Validation** — Validates slot against doctor availability and leave blocks before the transaction.
> 2. **Pessimistic Row Locking** — `SELECT * FROM doctors WHERE id = $1 FOR UPDATE` serializes concurrent booking attempts for the same doctor.
> 3. **ACID Transaction Isolation** — The lock check and the `INSERT` happen inside a single atomic `withTransaction` block.
> 4. **Partial Unique Index** — `uq_active_doctor_slot` acts as an absolute hard boundary at the database engine level.

**Q54. What is `uq_active_doctor_slot`?**
> A **partial unique index** on the `appointments` table:
> ```sql
> CREATE UNIQUE INDEX uq_active_doctor_slot
> ON appointments(doctor_id, appointment_date, start_time)
> WHERE status NOT IN ('CANCELLED');
> ```
> This guarantees no two non-cancelled appointments can share the same doctor, date, and start time.

**Q55. Why is this a *partial* unique index?**
> Because cancelled appointments are excluded from the index predicate, cancelling an appointment **immediately frees the slot** for new bookings — no extra cleanup or array manipulation needed.

**Q56. What HTTP status code is returned when a slot is already taken?**
> `409 Conflict` with `errorCode: "SLOT_UNAVAILABLE"`.

**Q57. What PostgreSQL error code signals a double-booking conflict?**
> Error code `23505` — `unique_violation`. The backend catches this and converts it into the standard `409 SLOT_UNAVAILABLE` response.

**Q58. How are appointment slots generated dynamically?**
> `getDoctorSlotsForDate(doctorId, dateStr)`:
> 1. Determines the day of week for the requested date.
> 2. Queries `doctor_availability` for the recurring schedule. Defaults to 09:00–17:00 if unconfigured.
> 3. Checks `doctor_leave_blocks` — full-day leave returns empty slots.
> 4. Queries all active (non-cancelled) appointments on that date.
> 5. Iterates from `start_time` to `end_time` in `slot_duration_minutes` increments.
> 6. Marks each slot `available = false` if: it is in the past, already booked, or overlaps a partial-day leave block.

**Q59. What happens step-by-step when a Patient books an appointment?**
> `POST /api/v1/appointments`:
> 1. Resolves patient record from `req.user.id`.
> 2. Validates the appointment date is not in the past.
> 3. Validates the slot using `getDoctorSlotsForDate()`.
> 4. Inside `withTransaction`:
>    - Locks the doctor row: `SELECT FOR UPDATE`.
>    - Re-checks if the slot is still free.
>    - Inserts appointment with `status = 'CONFIRMED'`.
> 5. Triggers `notifyAppointmentBooked` for both patient and doctor.
> 6. Returns `201 Created` with the new appointment.

**Q60. How does rescheduling work atomically?**
> `POST /api/v1/appointments/:id/reschedule`:
> 1. Verifies patient ownership and status is `CONFIRMED` or `PENDING`.
> 2. Validates the new slot against doctor's schedule and leave blocks.
> 3. Inside a transaction, updates `appointment_date`, `start_time`, `end_time`.
> 4. If the new slot is taken, the transaction **rolls back** — the original appointment is unchanged.
> 5. Triggers `notifyAppointmentRescheduled`.

**Q61. Who can cancel an appointment?**
> - The **Patient** who owns it
> - The **Doctor** treating the patient
> - Any **Administrator**
>
> Appointments with status `COMPLETED` or already `CANCELLED` cannot be cancelled.

**Q62. What is the full appointment status lifecycle?**
> `CONFIRMED` → `COMPLETED` (by Doctor) | `CANCELLED` (by Patient/Doctor/Admin) | `NO_SHOW`

**Q63. What consultation types are supported?**
> `in-person`, `video`, `phone` — enforced by a database CHECK constraint.

**Q64. What fields are stored in an `appointments` row?**
> `id`, `patient_id`, `doctor_id`, `appointment_date`, `start_time`, `end_time`, `appointment_type`, `status`, `reason`, `notes`, `patient_phone`, `amount`, `created_at`, `updated_at`.

---

## 10. Prescriptions

**Q65. Who can create a prescription?**
> Only a **Doctor**, and only for a **COMPLETED** appointment that they treated.

**Q66. How does prescription creation work?**
> `POST /api/v1/prescriptions`:
> 1. Verifies doctor ownership and `COMPLETED` appointment status.
> 2. Inside `withTransaction`:
>    - Inserts the prescription header into `prescriptions`.
>    - Bulk inserts medicine items into `prescription_items`.
> 3. Sends a prescription-ready notification to the patient.

**Q67. What are the two prescription tables?**
> - **`prescriptions`**: `id`, `appointment_id` (UNIQUE), `doctor_id`, `patient_id`, `diagnosis`, `lab_tests`, `advice`, `follow_up_date`, `next_visit_in`, `is_signed`, `notes`.
> - **`prescription_items`**: Normalized 1-to-many list of medications: `medicine_name`, `dosage`, `frequency`, `duration`, `instructions`, `quantity`.

**Q68. How can a Patient view their prescriptions?**
> `GET /api/v1/prescriptions/my` — Returns all prescriptions with medicine items, sorted by date.

**Q69. Can a prescription be retrieved by appointment ID?**
> Yes — `GET /api/v1/prescriptions/appointment/:id` fetches the prescription and all medicine items for a specific appointment.

---

## 11. Medical Records

**Q70. What types of medical records can be uploaded?**
> `Blood Test`, `Lab Report`, `X-Ray`, `MRI`, `CT Scan`, `Ultrasound`, `Prescription`, `ECG`, `Other` — validated by a CHECK constraint.

**Q71. How does file upload work for medical records?**
> `POST /api/v1/medical-records`:
> 1. File received via **Multer** (memory storage — no disk write).
> 2. Buffer streamed to Cloudinary under the `medical_records` folder with `type: "authenticated"`.
> 3. File metadata (`cloudinary_public_id`, `file_url`, `title`, `record_type`, etc.) inserted into the `medical_records` table.

**Q72. What does `type: "authenticated"` mean for Cloudinary uploads?**
> Medical records are stored as **private** Cloudinary assets. The API returns **signed URLs valid for 1 hour** instead of permanent public URLs, ensuring patient data is protected.

**Q73. How does a Patient share a medical record with a Doctor?**
> `POST /api/v1/medical-records/share` — Appends the `doctorId` to the `shared_with_doctors` UUID array in the `medical_records` row.

**Q74. How does a Doctor view records shared with them?**
> `GET /api/v1/medical-records/shared-with-me` — Queries records where the doctor's UUID is present in the `shared_with_doctors` array.

**Q75. How does deleting a medical record work?**
> `DELETE /api/v1/medical-records/:id`:
> 1. Deletes the row from PostgreSQL.
> 2. Calls `cloudinary.uploader.destroy(cloudinary_public_id)` to remove the file from Cloudinary.

---

## 12. Reviews & Ratings

**Q76. Who can submit a review?**
> A **Patient**, but only for a **COMPLETED** appointment that belongs to them.

**Q77. How does submitting a review update the doctor's rating?**
> `POST /api/v1/reviews`:
> 1. Verifies patient ownership of a completed appointment.
> 2. Inside `withTransaction`:
>    - Inserts the review into `reviews`.
>    - Re-aggregates all reviews for the doctor and updates `doctors.avg_rating` and `doctors.total_reviews`.

**Q78. What are the review validation rules?**
> - Rating must be between **1 and 5** (inclusive).
> - Comment is **required**.

**Q79. What is the default review visibility?**
> Reviews require admin approval. Public doctor profiles show only reviews where `is_approved = true`.

**Q80. Can an Admin manage reviews?**
> Yes — `PUT /api/v1/reviews/:id/approval` toggles visibility and recalculates doctor rating statistics.

---

## 13. Notifications

**Q81. What events trigger in-app notifications?**
> - Appointment **Booked** — Patient gets confirmation; Doctor gets booking alert.
> - Appointment **Rescheduled** — Both Patient and Doctor are notified.
> - Appointment **Cancelled** — Both notified with info on who cancelled.
> - Appointment **Completed** — Patient receives a prompt to leave a review.
> - Prescription **Ready** — Patient is notified when a prescription is issued.

**Q82. How are notifications stored?**
> Each notification is a row in the `notifications` table: `user_id`, `type`, `title`, `message`, `related_id`, `link`, `is_read`.

**Q83. How does a user retrieve their notifications?**
> `GET /api/v1/notifications` — Returns all notifications for the logged-in user with an unread count.

**Q84. How are notifications marked as read?**
> - `POST /api/v1/notifications/:id/read` — Marks a single notification as read.
> - `POST /api/v1/notifications/read-all` — Marks all notifications for the user as read.

---

## 14. AI Symptom Triage

**Q85. What is the AI Symptom Triage feature?**
> A patient describes their symptoms in natural language. The backend sends this to the Groq API (Llama-3 model), which returns structured triage data: extracted symptoms, suggested medical specialty, urgency level, and a brief explanation. The backend then queries PostgreSQL for actual matching doctors.

**Q86. Does the AI diagnose illnesses?**
> **No.** The AI is intentionally constrained to **symptom-to-specialty triage only**. It does not prescribe medications, diagnose illnesses, or replace licensed physicians.

**Q87. What are the possible urgency levels returned by the AI?**
> `routine`, `urgent`, or `emergency`.

**Q88. What AI model and temperature are used?**
> Model: `llama-3.3-70b-versatile` via Groq API. Temperature: **0.2** (low, for deterministic and clinically safe responses).

**Q89. What is the prompt version used?**
> `SYMPTOM_TRIAGE_V1` — defined in `backend/src/services/ai/prompts/symptomTriage.prompt.js`.

**Q90. What does the AI response schema look like?**
> ```json
> {
>   "symptoms": ["string"],
>   "suggestedSpecialty": "one of the available specialties",
>   "urgency": "routine | urgent | emergency",
>   "reason": "2-sentence explanation",
>   "disclaimer": "This is informational triage guidance and does not constitute a formal medical diagnosis."
> }
> ```

**Q91. Why does the prompt include the full list of available specialties?**
> To prevent the AI from hallucinating specialty names. The model is constrained to return only specialties that exist in the MediBook `specializations` table.

**Q92. What happens if the Groq API fails or times out?**
> The backend catches the failure and returns:
> ```json
> {
>   "success": false,
>   "errorCode": "AI_SERVICE_UNAVAILABLE",
>   "message": "Unable to process symptoms right now. Please browse doctors by specialty manually."
> }
> ```
> The core appointment and healthcare platform continues functioning with 100% availability.

**Q93. How is the AI's specialty suggestion matched to actual doctors?**
> 1. The returned specialty is matched against the `specializations` table (with fuzzy normalization for slight variations).
> 2. All approved doctors with that `specialization_id` are queried.
> 3. Dynamic availability slots for upcoming dates are computed.

**Q94. What is the API endpoint for symptom triage?**
> `POST /api/v1/ai/symptom-check` — Accessible by any authenticated user.

---

## 15. Database Design

**Q95. What is the central table in the MediBook database?**
> `users` — stores all users (Patients, Doctors, and Admins) with authentication credentials and basic profile data.

**Q96. What are all the database tables?**
> 1. `users` — Core authentication entity
> 2. `patients` — Extended patient profile (1-to-1 with users)
> 3. `doctors` — Doctor credentials and metadata (1-to-1 with users)
> 4. `specializations` — Lookup table for medical specialties
> 5. `doctor_availability` — Weekly recurring schedule rules
> 6. `doctor_leave_blocks` — Date-based leave overrides
> 7. `appointments` — Core scheduling entity
> 8. `prescriptions` — Prescription headers
> 9. `prescription_items` — Individual medicine entries per prescription
> 10. `medical_records` — Patient uploaded health documents
> 11. `reviews` — Patient ratings and comments for doctors
> 12. `notifications` — In-app alert messages
> 13. `refresh_tokens` — Stored refresh token hashes for session management
> 14. `otps` — Ephemeral one-time codes for registration and password reset

**Q97. How is the `users` table structured?**
> `id` (UUID PK), `name`, `email` (UNIQUE), `password_hash`, `role` (CHECK: PATIENT/DOCTOR/ADMIN), `phone`, `avatar_url`, `is_active` (DEFAULT true), `is_verified` (DEFAULT true), `created_at`, `updated_at`.

**Q98. How is the `patients` table related to `users`?**
> Via a **1-to-1 foreign key**: `patients.user_id` → `users.id` ON DELETE CASCADE. Deleting a user automatically deletes their patient profile.

**Q99. What patient-specific medical fields are stored?**
> `date_of_birth`, `gender`, `blood_group`, `insurance_provider`, `insurance_policy_no`, `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relation`, `allergies` (TEXT[]), `chronic_conditions` (TEXT[]), `current_medications` (TEXT[]), `past_surgeries` (TEXT[]), `address` (JSONB).

**Q100. What doctor-specific fields are stored in the `doctors` table?**
> `specialization_id`, `qualification`, `experience_years` (CHECK >= 0), `bio`, `consultation_fee` (CHECK >= 0), `license_number`, `is_approved` (DEFAULT true), `is_available` (DEFAULT true), `hospital_affiliation`, `consultation_room`, `address` (JSONB), `avg_rating` (NUMERIC 3,2), `total_reviews`.

**Q101. How does the `doctor_availability` table prevent duplicate schedules?**
> A UNIQUE constraint on `(doctor_id, day_of_week)` ensures only one schedule rule per weekday per doctor.

**Q102. What is the default slot duration for appointments?**
> **30 minutes** — defined in `doctor_availability.slot_duration_minutes` (DEFAULT 30).

**Q103. What are the valid appointment statuses?**
> `PENDING`, `CONFIRMED`, `COMPLETED`, `CANCELLED`, `NO_SHOW` — enforced by a CHECK constraint.

**Q104. How are prescription medicines stored?**
> In a separate normalized `prescription_items` table (1-to-many relationship with `prescriptions`). Fields: `medicine_name`, `dosage`, `frequency`, `duration`, `instructions`, `quantity`.

**Q105. How does the `medical_records` table support sharing with doctors?**
> Via a `shared_with_doctors` column of type `UUID[]` (PostgreSQL array). The patient appends doctor UUIDs to this array to grant access.

**Q106. What normalization level is the MediBook database at?**
> **Third Normal Form (3NF)**. Prescriptions, scheduling rules, and patient data are all normalized into separate linked tables, eliminating the data duplication anomalies present in the MongoDB design.

**Q107. What was the MongoDB slot tracking approach and its flaw?**
> Slots were stored as `slots_booked: { "12_10_2026": ["10:00"] }` — an embedded dictionary in the doctor document. Read-modify-write cycles on this structure caused race conditions and potential booking data loss during concurrent updates.

**Q108. How does the `withTransaction` function work?**
> 1. Acquires a connection from the pool.
> 2. Executes `BEGIN TRANSACTION ISOLATION LEVEL <level>`.
> 3. Runs the callback with the client.
> 4. Calls `COMMIT` on success.
> 5. Calls `ROLLBACK` on any error, then releases the connection back to the pool.

---

## 16. API Design & Conventions

**Q109. What is the base URL for all API routes?**
> `/api/v1`

**Q110. What is the standard API response format?**
> ```json
> {
>   "success": true,
>   "statusCode": 200,
>   "message": "Human-readable message",
>   "data": { ... }
> }
> ```

**Q111. What is the standard error response format?**
> ```json
> {
>   "success": false,
>   "statusCode": 400,
>   "message": "Error description",
>   "errors": [...],
>   "code": "ERROR_CODE"
> }
> ```

**Q112. What HTTP method and path books an appointment?**
> `POST /api/v1/appointments`

**Q113. What HTTP method and path gets a patient's appointments?**
> `GET /api/v1/appointments/my`

**Q114. What HTTP method and path gets a doctor's appointments?**
> `GET /api/v1/appointments/doctor`

**Q115. What HTTP method and path reschedules an appointment?**
> `POST /api/v1/appointments/:id/reschedule`

**Q116. What HTTP method and path cancels an appointment?**
> `POST /api/v1/appointments/:id/cancel`

**Q117. What HTTP method and path completes an appointment (Doctor only)?**
> `POST /api/v1/appointments/:id/complete`

**Q118. What HTTP method and path retrieves available slots for a doctor?**
> `GET /api/v1/doctors/:id/availability?date=YYYY-MM-DD`

**Q119. What HTTP method and path uploads a medical record?**
> `POST /api/v1/medical-records` (multipart form, field name: `file`)

**Q120. What HTTP method and path does the AI symptom check?**
> `POST /api/v1/ai/symptom-check`

**Q121. What is the strict module layout convention for every feature?**
> ```
> src/modules/<name>/
>   <name>.routes.js     - Express Router; attaches middleware, delegates to controller
>   <name>.controller.js - Thin: one asyncHandler per action, calls one service function
>   <name>.service.js    - All business logic and DB queries; throws ApiError on failures
> ```
> Controllers never contain `try/catch` or DB queries. Services never set HTTP responses.

**Q122. How are IDs handled across the API?**
> All IDs are **UUIDs**. API responses expose `id`. Frontend pages support both `obj.id` and `obj._id` for backward compatibility with cached data.

---

## 17. Middleware & Utilities

**Q123. What does the `authenticate` middleware do?**
> Extracts the JWT from the `Authorization: Bearer <token>` header, verifies the signature, and attaches the decoded user payload to `req.user`.

**Q124. What does `asyncHandler` do?**
> A higher-order function that wraps async route handlers. Any thrown error is automatically forwarded to the global Express error handler — eliminating the need for `try/catch` in every controller.

**Q125. What validation library is used?**
> **Zod** — in `validate.middleware.js`. Returns `400 Bad Request` with field-level error messages on invalid input.

**Q126. What are the built-in request validators?**
> - `validateBookAppointment` — slot date/time format, `appointmentType` enum
> - `validateRescheduleAppointment` — date/time only, not in the past
> - `validatePrescription` — `diagnosis` required, `medicines` array non-empty
> - `validateReview` — rating 1–5, comment required

**Q127. How does Multer handle file uploads?**
> Multer is configured with **memory storage** — files are held in a buffer in memory before being streamed to Cloudinary, avoiding any temporary disk writes.

**Q128. What does `ApiError` contain?**
> HTTP `statusCode`, `message`, `errors` array, operational error `code` (e.g., `SLOT_UNAVAILABLE`, `TOKEN_EXPIRED`), and `isOperational: true`.

**Q129. What does `ApiResponse` produce?**
> A standardized payload: `{ statusCode, data, message, success }`.

---

## 18. Error Handling

**Q130. What HTTP status is returned for a slot conflict?**
> `409 Conflict` with `code: "SLOT_UNAVAILABLE"`.

**Q131. What HTTP status is returned for an expired access token?**
> `401 Unauthorized` with `code: "TOKEN_EXPIRED"`. The frontend Axios interceptor automatically calls `/auth/refresh` and retries the request.

**Q132. What HTTP status is returned for a session hijack attempt?**
> `401 Unauthorized` with `code: "SESSION_HIJACK_DETECTED"`.

**Q133. What HTTP status is returned for failed request validation?**
> `400 Bad Request` with field-level `errors` listing each invalid field.

**Q134. What HTTP status is returned for rate limit exceeded?**
> `429 Too Many Requests`.

**Q135. What HTTP status is returned for unauthorized role access?**
> `403 Forbidden`.

**Q136. What HTTP status is returned for a resource not found?**
> `404 Not Found`.

**Q137. How does the frontend handle token expiry silently?**
> `apiClient.js` includes a **JWT Bearer + token refresh interceptor**. On `401 TOKEN_EXPIRED`, it automatically calls `POST /auth/refresh` to get a new access token and retries the original failed request transparently.

---

## 19. Performance & Indexing

**Q138. What indexes exist in the MediBook database?**

| Index | Table | Columns | Purpose |
|---|---|---|---|
| `idx_users_email` | `users` | `email` | Fast O(1) login lookup |
| `idx_doctors_specialization_id` | `doctors` | `specialization_id` | Filter by specialty |
| `idx_doctors_is_approved` | `doctors` | `is_approved` | Public doctor listing |
| `idx_appointments_doc_date` | `appointments` | `doctor_id, appointment_date` | Slot generation & doctor schedule |
| `idx_appointments_patient_date` | `appointments` | `patient_id, appointment_date` | Patient appointment listing |
| `idx_appointments_status` | `appointments` | `status` | Admin analytics aggregation |
| `idx_medical_records_patient` | `medical_records` | `patient_id` | Patient medical timeline |
| `idx_notifications_user_read` | `notifications` | `user_id, is_read` | Unread notification count |
| `idx_reviews_doctor` | `reviews` | `doctor_id` | Doctor ratings & reviews |
| `idx_refresh_tokens_hash` | `refresh_tokens` | `token_hash` | Token validation |
| `uq_active_doctor_slot` (partial) | `appointments` | `doctor_id, appointment_date, start_time` WHERE not cancelled | Double-booking prevention |

**Q139. Why is there a composite index on `appointments(doctor_id, appointment_date)`?**
> Doctor dashboard and the dynamic slot generation algorithm always filter by both fields simultaneously. A composite index covers both dimensions in one B-tree scan.

**Q140. Why is there a composite index on `notifications(user_id, is_read)`?**
> The unread badge count query filters by `user_id` AND `is_read = false`. This composite index allows the lookup without a full table scan.

---

## 20. Project Architecture & File Structure

**Q141. What is the backend entry point?**
> `backend/server.js` — verifies DB connection, configures Cloudinary, and starts Express on the configured `PORT`.

**Q142. What does `backend/src/app.js` do?**
> Sets up the Express app with CORS, JSON/multipart parsers, mounts all feature routers under `/api/v1`, and attaches the global error handler.

**Q143. Where are all module routers registered?**
> `backend/src/routes/index.js` — imports every feature's router and mounts them under `/api/v1`.

**Q144. What is in the `backend/src/config/` folder?**
> Cloudinary SDK initialization — configures the Cloudinary client with credentials from environment variables.

**Q145. What is in `backend/src/db/`?**
> - Drizzle ORM schema definitions
> - PostgreSQL connection pool using `pg.Pool`
> - `withTransaction`, `query`, `getClient`, and `testConnection` functions

**Q146. What utility functions are in `backend/src/utils/`?**
> - `ApiError.js` — Standardized error class
> - `ApiResponse.js` — Standardized response wrapper
> - `asyncHandler.js` — Async route wrapper
> - `cloudinaryUpload.js` — Cloudinary stream upload helper
> - `sendEmail.js` — Nodemailer email dispatcher (for OTP delivery)

**Q147. What is in `backend/scripts/`?**
> - `seed.js` — Seeds specializations and admin user
> - `seed_demo.js` — Seeds demo accounts (patient, doctor, admin)
> - `cleanup_demo_prod.js` — Prunes stale production data
> - `smoke_test.mjs` — End-to-end API smoke test covering 12 core flows

**Q148. What pages are in the frontend?**
> - **Public**: Home, Doctors listing, Doctor Detail, Login/Register, Symptom Checker
> - **Patient**: Book Appointment (dynamic slot picker), My Appointments, My Profile, My Records, My Prescriptions
> - **Doctor**: Dashboard, Appointments, Prescriptions, Patient Records
> - **Admin**: Dashboard, Doctors management, Appointments management

**Q149. What is in `frontend/src/context/`?**
> `AppContext` — provides global state including auth tokens, the doctors list, and notifications, wrapping the entire application.

**Q150. What is in `frontend/src/services/`?**
> - `apiClient.js` — Axios instance with JWT Bearer header attachment and token refresh interceptor.
> - One `*.service.js` file per backend module (wraps all `apiClient` calls for that feature).

**Q151. What is in `frontend/src/constants/`?**
> The list of medical specialties and available appointment slot times used across the UI.

**Q152. What frontend router does MediBook use?**
> **React Router v6** — configured in `frontend/src/App.jsx` with role-based route guarding.

**Q153. What is the CORS configuration?**
> The backend allows requests only from `FRONTEND_URL` (set in `.env`). The Express `cors` middleware is configured in `app.js`.

**Q154. What does the `smoke_test.mjs` script test?**
> 12 end-to-end API flows covering the entire platform — run with `node scripts/smoke_test.mjs` against a locally running server to validate all core features are working correctly.

---

*This document covers every question across all layers of the MediBook platform — from first-principles architecture to individual function behavior. Last reviewed: October 2026.*
