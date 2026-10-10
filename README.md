# MediBook

A full-stack healthcare appointment booking application built with React, Node.js/Express, PostgreSQL, and Drizzle ORM. MediBook provides comprehensive role-based workflows for Patients, Doctors, and Administrators.

Live demo → **[medibook-fcwr.vercel.app](https://medibook-fcwr.vercel.app)**

---

## Key Features

**For Patients:**
- Register, authenticate, and manage personal profile (blood group, DOB, insurance, emergency contact)
- Browse doctors filtered by medical specializations
- Book appointments (in-person, video, or phone consultation) with slot conflict protection
- View, reschedule, or cancel existing appointments
- Access digital prescriptions issued by attending doctors
- Upload medical records and share them securely with designated doctors
- Perform preliminary AI symptom triage

**For Doctors:**
- Role-restricted dashboard for managing daily schedules and patient list
- View patient details and uploaded medical records shared for consultations
- Mark appointments as completed and generate detailed digital prescriptions with medicine items
- Manage weekly recurring availability and leave blocks

**For Administrators:**
- Comprehensive platform metrics (total doctors, patients, appointments, revenue)
- Add new doctors with photo upload via Cloudinary
- Manage doctor approvals and system-wide appointment cancellations

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Axios |
| **Backend** | Node.js, Express.js (ES Modules, Feature Modules architecture) |
| **Database & ORM** | PostgreSQL, Drizzle ORM, Drizzle Kit (Migrations & Studio) |
| **Storage & Media** | Cloudinary (Doctor photos & Patient medical record documents) |
| **Auth & Security** | JWT (Role-scoped access tokens), Bcrypt password hashing |
| **AI Integration** | Groq API / Llama-3 for intelligent symptom triage |

---

## Local Setup & Development

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Cloudinary Account (optional for media uploads)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/RUSH0610/medibook.git
cd medibook

# Install backend dependencies
cd backend && npm install

# Install frontend dependencies
cd ../frontend && npm install
```

### 2. Configure Environment Variables

Create `backend/.env`:
```env
PORT=4000
FRONTEND_URL=http://localhost:5173

# PostgreSQL Connection
PG_HOST=127.0.0.1
PG_PORT=5432
PG_USER=postgres
PG_PASSWORD=your_password
PG_DATABASE=medibook
DATABASE_URL=postgresql://postgres:your_password@127.0.0.1:5432/medibook

# Authentication
JWT_SECRET=your_jwt_secret_key
ADMIN_EMAIL=admin@medibook.com
ADMIN_PASSWORD=admin123456

# External Services
CLOUDINARY_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret
GROQ_API_KEY=your_groq_api_key
```

Create `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:4000
```

### 3. Database Migration & Seeding
```bash
cd backend

# Generate/apply Drizzle migrations
npm run db:generate
npm run db:migrate

# Start backend (auto-runs baseline migration & seed data on start)
npm run dev
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
```

- Frontend client → `http://localhost:3000`
- Backend API server → `http://localhost:4000`

---

## Project Structure

```text
medibook/
├── backend/
│   ├── server.js                  # Entry point: DB check, seed, Cloudinary, listen
│   ├── drizzle.config.js
│   ├── scripts/
│   │   ├── smoke_test.mjs         # End-to-end API smoke test (12 flows, run: node scripts/smoke_test.mjs)
│   │   ├── demo_seed.mjs          # Seeds demo accounts (admin / patient / doctor)
│   │   └── prod_cleanup.mjs       # Prunes stale data in production
│   └── src/
│       ├── app.js                 # Express app: CORS, parsers, /api/v1 router, global error handler
│       ├── routes/index.js        # Mounts every module router under /api/v1
│       ├── config/                # Cloudinary SDK setup
│       ├── db/                    # Drizzle schema, migrations, pool, startup seed
│       ├── middlewares/
│       │   ├── auth.middleware.js       # requireAuth, requirePatient, requireDoctor, requireAdmin
│       │   ├── upload.middleware.js     # Multer memory-storage for file uploads
│       │   ├── validate.middleware.js   # Zod-based request validators → 400 on bad input
│       │   └── rateLimit.middleware.js  # In-memory sliding-window limiter (auth endpoints)
│       ├── modules/               # One folder per feature — strict 3-tier layout:
│       │   ├── admin/             #   *.routes.js  – express.Router, attaches middleware
│       │   ├── ai/                #   *.controller.js – thin: asyncHandler + one service call
│       │   ├── appointments/      #   *.service.js – all business logic & DB queries
│       │   ├── auth/
│       │   ├── doctors/
│       │   ├── medicalRecords/
│       │   ├── notifications/
│       │   ├── prescriptions/
│       │   ├── reviews/
│       │   └── users/
│       └── utils/                 # ApiError, ApiResponse, asyncHandler, cloudinaryUpload, sendEmail
├── frontend/
│   └── src/
│       ├── App.jsx                # Client-side routes (React Router v6)
│       ├── components/            # Navbar, Footer, AdminSidebar, DoctorSidebar
│       ├── context/               # AppContext (tokens, doctors list, notifications)
│       ├── constants/             # Speciality list, slot times
│       ├── pages/
│       │   ├── public/            # Home, Doctors, DoctorDetail, Login, SymptomChecker
│       │   ├── patient/           # Appointment (dynamic slot picker), MyAppointments,
│       │   │                      # MyProfile, MyRecords, MyPrescriptions
│       │   ├── doctor/            # Dashboard, Appointments, Prescriptions, PatientRecords
│       │   └── admin/             # Dashboard, Doctors, Appointments
│       └── services/              # apiClient.js (JWT Bearer + token refresh interceptor)
│                                  # One *.service.js per module (wraps apiClient calls)
└── docs/
```

---

## Documentation

Detailed architecture documentation is available in the [`docs/`](./docs) folder:
- [Setup Guide](./docs/setup.md)
- [Database Schema & Design](./docs/database-design.md)
- [Authentication & JWT](./docs/authentication.md)
- [Role-Based Authorization](./docs/authorization.md)
- [Appointment Concurrency & Transactions](./docs/appointment-concurrency.md)
- [AI Symptom Triage Architecture](./docs/ai-architecture.md)
- [API Route Specifications](./docs/api-design.md)
- [Functions & Workflows](./docs/functions-and-workflows.md)

