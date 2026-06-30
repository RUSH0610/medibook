# MediBook — Doctor Appointment Booking Platform

A full-stack MERN web application that streamlines doctor-patient interactions by enabling seamless appointment booking, prescription management, and medical record tracking — all in one secure platform.

---

## ✨ Features

### 🧑‍⚕️ Patient Features
- Register & login with JWT-based authentication
- Browse doctors by speciality and location
- Book, reschedule, or cancel appointments (in-person / video / phone)
- View upcoming and past appointments
- Receive digital prescriptions from doctors
- Upload and manage personal medical records
- Share medical records securely with doctors
- View and update personal profile (DOB, blood group, insurance info)

### 👨‍⚕️ Doctor Features
- Dedicated login and dashboard
- View assigned appointments and patient details
- Mark appointments as completed
- Issue prescriptions for completed appointments
- Access medical records shared by patients
- Manage availability and profile

### 🛡️ Admin Features
- Secure admin login with time-limited JWT
- Add and manage doctors (with Cloudinary image upload)
- View all appointments and users
- Dashboard with live stats (doctors, patients, appointments, earnings)
- Cancel any appointment and release doctor slots

---

## 🛠️ Tech Stack

| Layer      | Technology |
|------------|------------|
| **Frontend**  | React 18, Vite, Tailwind CSS, React Router v6, Axios |
| **Backend**   | Node.js, Express.js, Multer, JWT (jsonwebtoken) |
| **Database**  | MongoDB Atlas, Mongoose ODM |
| **Storage**   | Cloudinary (images & medical records) |
| **Auth**      | JWT — separate tokens for user / doctor / admin roles |

---

## 🚀 Setup & Run

### Prerequisites
- Node.js >= 18
- npm >= 9
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)

### 1. Clone the repository
```bash
git clone https://github.com/your-username/medibook.git
cd medibook
```

### 2. Install dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configure environment variables

**Backend** — create `backend/.env`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/medibook
JWT_SECRET=your_super_secret_jwt_key
ADMIN_EMAIL=admin@medibook.com
ADMIN_PASSWORD=your_secure_admin_password
CLOUDINARY_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_api_secret
FRONTEND_URL=http://localhost:5173
PORT=4000
```

**Frontend** — create `frontend/.env`:
```env
VITE_BACKEND_URL=http://localhost:4000
```

### 4. Run the project

```bash
# Start backend (from /backend directory)
npm run dev

# Start frontend (from /frontend directory, in a new terminal)
npm run dev
```

Frontend runs at: **http://localhost:5173**  
Backend API runs at: **http://localhost:4000**

---

## 🔄 Demo Flow

1. **Register** as a patient at `/register` and log in
2. **Browse doctors** on the home page, filter by speciality
3. **Book an appointment** — pick a doctor, choose a date/time slot and appointment type (in-person/video/phone)
4. **Doctor logs in** via `/doctor-login`, views the appointment, marks it as completed, and issues a prescription
5. **Patient** views the prescription and appointment history on the **My Appointments** and **My Profile** pages

---

## 🔐 Environment Variables Reference

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key used to sign all JWT tokens |
| `ADMIN_EMAIL` | Admin login email |
| `ADMIN_PASSWORD` | Admin login password |
| `CLOUDINARY_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_SECRET_KEY` | Cloudinary API secret |
| `FRONTEND_URL` | Frontend origin URL (used for CORS) |
| `PORT` | Backend server port (default: 4000) |
| `VITE_BACKEND_URL` | Backend API base URL (frontend) |

---

## 📁 Project Structure

```
medibook/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middlewares/     # Auth, upload, error handling
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   └── utils/           # ApiError, ApiResponse, asyncHandler
│   ├── server.js
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # React Context (AppContext)
│   │   ├── pages/           # Page-level components
│   │   └── services/        # Axios API service functions
│   └── .env
└── README.md
```

---

## 👤 Author

Built as a full-stack portfolio project demonstrating end-to-end MERN development, JWT authentication, cloud storage integration, and role-based access control.
