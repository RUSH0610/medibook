# MediBook Local Environment & Setup Guide

## 1. Prerequisites
- **Node.js**: v18.x or later (v24 supported)
- **PostgreSQL**: v14.x or later (v18 supported)
- **npm**: v9.x or later

---

## 2. Environment Variables Configuration

### 2.1 Backend (`backend/.env`)
Create `backend/.env` with the following variables:
```env
PORT=4000
FRONTEND_URL=http://localhost:5173

# PostgreSQL Database Configuration
PG_HOST=127.0.0.1
PG_PORT=5433
PG_USER=postgres
PG_PASSWORD=
PG_DATABASE=medibook
DATABASE_URL=postgresql://postgres@127.0.0.1:5433/medibook

# Authentication Secrets
JWT_SECRET=medibook_secret_key_12345
JWT_ACCESS_SECRET=medibook_jwt_access_secret_super_secure_2026
JWT_REFRESH_SECRET=medibook_jwt_refresh_secret_super_secure_rotate_2026

# Administrator Defaults
ADMIN_EMAIL=admin@medibook.com
ADMIN_PASSWORD=admin123456

# External Integrations
CLOUDINARY_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret

GROQ_API_KEY=your_groq_api_key
GMAIL_USER=your_email@gmail.com
GMAIL_APP_PASSWORD=your_gmail_app_password
```

### 2.2 Frontend (`frontend/.env`)
```env
VITE_BACKEND_URL=http://localhost:4000
```

---

## 3. Database Initialization & Seeding

1. Ensure PostgreSQL is running on the configured port (`5433` or standard `5432`).
2. Run database migration and initial seed data:
```bash
cd backend
npm run db:migrate && npm run db:seed
```
*(Demo data for local development: `npm run db:seed:demo`.)*

---

## 4. Running the Application

### 4.1 Start Backend Server
```bash
cd backend
npm run dev
```
The backend starts on `http://localhost:4000`. Health endpoint available at `http://localhost:4000/health`.

### 4.2 Start Frontend Client
```bash
cd frontend
npm run dev
```
The frontend Vite server starts on `http://localhost:5173`.

---

## 5. Pre-Seeded Default Accounts

| Role | Email | Password | Details |
|---|---|---|---|
| **Admin** | `admin@medibook.com` | `admin123456` | Full platform control, doctor approval, analytics |
| **Doctor** | `richard.james@medibook.com` | `doctor123456` | General Physician with Mon-Fri 9-5 availability |
| **Doctor** | `emily.larson@medibook.com` | `doctor123456` | Gynecologist with Mon-Fri 9-5 availability |
| **Patient** | `patient@medibook.com` | `patient123` | Patient Jane Doe with existing health profile |
