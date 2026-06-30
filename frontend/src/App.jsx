import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Layout
import Navbar from "./components/Navbar.jsx";
import Footer from "./components/Footer.jsx";
import PatientMenu from "./components/PatientMenu.jsx";

// User pages
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Doctors from "./pages/Doctors.jsx";
import DoctorDetail from "./pages/DoctorDetail.jsx";
import Appointment from "./pages/Appointment.jsx";
import MyAppointments from "./pages/MyAppointments.jsx";
import MyProfile from "./pages/MyProfile.jsx";
import MyRecords from "./pages/MyRecords.jsx";
import MyPrescriptions from "./pages/MyPrescriptions.jsx";

// Admin pages
import AdminDashboard from "./pages/Admin/Dashboard.jsx";
import AdminDoctors from "./pages/Admin/Doctors.jsx";
import AdminAddDoctor from "./pages/Admin/AddDoctor.jsx";
import AdminAppointments from "./pages/Admin/Appointments.jsx";
import AdminReviews from "./pages/Admin/Reviews.jsx";

// Doctor pages
import DoctorDashboard from "./pages/Doctor/Dashboard.jsx";
import DoctorAppointments from "./pages/Doctor/Appointments.jsx";
import DoctorProfile from "./pages/Doctor/Profile.jsx";
import DoctorPrescriptions from "./pages/Doctor/Prescriptions.jsx";
import DoctorPatientRecords from "./pages/Doctor/PatientRecords.jsx";

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
