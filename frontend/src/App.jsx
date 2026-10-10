import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Layout
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import PatientMenu from "./components/PatientMenu.jsx";

// User pages
import Home from "./pages/public/Home.jsx";
import Login from "./pages/public/Login.jsx";
import Doctors from "./pages/public/Doctors.jsx";
import DoctorDetail from "./pages/public/DoctorDetail.jsx";
import Appointment from "./pages/patient/Appointment.jsx";
import MyAppointments from "./pages/patient/MyAppointments.jsx";
import MyProfile from "./pages/patient/MyProfile.jsx";
import MyRecords from "./pages/patient/MyRecords.jsx";
import MyPrescriptions from "./pages/patient/MyPrescriptions.jsx";
import SymptomChecker from "./pages/public/SymptomChecker.jsx";

// Admin pages
import AdminDashboard from "./pages/admin/Dashboard.jsx";
import AdminDoctors from "./pages/admin/Doctors.jsx";
import AdminAddDoctor from "./pages/admin/AddDoctor.jsx";
import AdminAppointments from "./pages/admin/Appointments.jsx";
import AdminReviews from "./pages/admin/Reviews.jsx";

// Doctor pages
import DoctorDashboard from "./pages/doctor/Dashboard.jsx";
import DoctorAppointments from "./pages/doctor/Appointments.jsx";
import DoctorProfile from "./pages/doctor/Profile.jsx";
import DoctorPrescriptions from "./pages/doctor/Prescriptions.jsx";
import DoctorPatientRecords from "./pages/doctor/PatientRecords.jsx";

const UserLayout = ({ children }) => (
  <>
    <Navbar />
    <PatientMenu />
    <main className="min-h-screen">{children}</main>
    <Footer />
  </>
);

function App() {
  return (
    <BrowserRouter>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        {/* ── User Routes ── */}
        <Route
          path="/"
          element={
            <UserLayout>
              <Home />
            </UserLayout>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route
          path="/doctors"
          element={
            <UserLayout>
              <Doctors />
            </UserLayout>
          }
        />
        <Route
          path="/doctors/:speciality"
          element={
            <UserLayout>
              <Doctors />
            </UserLayout>
          }
        />
        <Route
          path="/doctor/:docId"
          element={
            <UserLayout>
              <DoctorDetail />
            </UserLayout>
          }
        />
        <Route
          path="/appointment/:docId"
          element={
            <UserLayout>
              <Appointment />
            </UserLayout>
          }
        />
        <Route
          path="/my-appointments"
          element={
            <UserLayout>
              <MyAppointments />
            </UserLayout>
          }
        />
        <Route
          path="/my-profile"
          element={
            <UserLayout>
              <MyProfile />
            </UserLayout>
          }
        />
        <Route
          path="/my-records"
          element={
            <UserLayout>
              <MyRecords />
            </UserLayout>
          }
        />
        <Route
          path="/my-prescriptions"
          element={
            <UserLayout>
              <MyPrescriptions />
            </UserLayout>
          }
        />
        <Route
          path="/symptom-checker"
          element={
            <UserLayout>
              <SymptomChecker />
            </UserLayout>
          }
        />

        {/* ── Admin Routes ── */}
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/doctors" element={<AdminDoctors />} />
        <Route path="/admin/add-doctor" element={<AdminAddDoctor />} />
        <Route path="/admin/appointments" element={<AdminAppointments />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />

        {/* ── Doctor Routes ── */}
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/appointments" element={<DoctorAppointments />} />
        <Route path="/doctor/profile" element={<DoctorProfile />} />
        <Route path="/doctor/prescriptions" element={<DoctorPrescriptions />} />
        <Route
          path="/doctor/patient-records"
          element={<DoctorPatientRecords />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
