import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import AdminSidebar from "../../components/AdminSidebar";
import { getAdminDashboard } from "../../services/admin.service.js";

const StatCard = ({ label, value, icon, color }) => (
  <div className="card flex items-center gap-4">
    <div
      className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-xl`}
    >
      {icon}
    </div>
    <div>
      <p className="text-2xl font-bold text-dark">{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  </div>
);

const AdminDashboard = () => {
  const { aToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentAppointments, setRecentAppointments] = useState([]);

  useEffect(() => {
    if (!aToken) {
      navigate("/login");
      return;
    }
    fetchDashboard();
  }, [aToken]);

  const fetchDashboard = async () => {
    try {
      const { data } = await getAdminDashboard(aToken);
      if (data.success) {
        setStats(data.dashData);
        setRecentAppointments(data.dashData.latestAppointments || []);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">Dashboard</h1>
          <p className="text-sm text-muted mt-1">Welcome back, Admin</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="Total Doctors"
              value={stats.doctors}
              icon={
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              }
              color="bg-blue-100"
            />
            <StatCard
              label="Total Patients"
              value={stats.patients}
              icon={
                <svg
                  className="w-6 h-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
              }
              color="bg-green-100"
            />
            <StatCard
              label="Total Appointments"
              value={stats.appointments}
              icon={
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              }
              color="bg-purple-100"
            />
            <StatCard
              label="Earnings"
              value={`₹${stats.earnings || 0}`}
              icon={
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              color="bg-yellow-100"
            />
          </div>
        )}

        {/* Recent Appointments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-dark">Recent Appointments</h2>
            <button
              onClick={() => navigate("/admin/appointments")}
              className="text-primary text-xs hover:underline"
            >
              View All →
            </button>
          </div>
          {recentAppointments.length === 0 ? (
            <p className="text-sm text-muted text-center py-6">
              No appointments yet
            </p>
          ) : (
            <div className="space-y-3">
              {recentAppointments.slice(0, 6).map((a) => (
                <div
                  key={a._id}
                  className="flex items-center gap-3 p-3 bg-surface rounded-lg"
                >
                  <img
                    src={a.docData?.image}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover bg-gray-200"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-dark truncate">
                      {a.docData?.name}
                    </p>
                    <p className="text-xs text-muted">
                      {a.slotDate?.replace(/_/g, "/")} · {a.slotTime}
                    </p>
                  </div>
                  <span
                    className={`badge ${
                      a.cancelled
                        ? "bg-red-100 text-red-600"
                        : a.isCompleted
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {a.cancelled
                      ? "Cancelled"
                      : a.isCompleted
                        ? "Done"
                        : "Pending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
