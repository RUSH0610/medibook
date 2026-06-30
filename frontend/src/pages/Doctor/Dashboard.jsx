import { useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import DoctorSidebar from "../../components/DoctorSidebar";
import { getDoctorDashboard, completeAppointment as completeApptService, cancelDoctorAppt } from "../../services/doctor.service.js";

const DoctorDashboard = () => {
  const { dToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [dash, setDash] = useState(null);

  useEffect(() => {
    if (!dToken) {
      navigate("/login");
      return;
    }
    fetchDash();
  }, [dToken]);

  const fetchDash = async () => {
    try {
      const { data } = await getDoctorDashboard(dToken);
      if (data.success) setDash(data.dashData);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const completeAppointment = async (id) => {
    try {
      const { data } = await completeApptService({ appointmentId: id }, dToken);
      if (data.success) {
        toast.success("Marked as completed");
        fetchDash();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cancelAppointment = async (id) => {
    try {
      const { data } = await cancelDoctorAppt({ appointmentId: id }, dToken);
      if (data.success) {
        toast.success("Cancelled");
        fetchDash();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <DoctorSidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">Doctor Dashboard</h1>
          <p className="text-sm text-muted mt-1">
            Overview of your appointments and earnings
          </p>
        </div>

        {dash && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              {[
                {
                  label: "Earnings",
                  value: `₹${dash.earnings || 0}`,
                  icon: (
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
                  ),
                  color: "bg-yellow-100",
                },
                {
                  label: "Appointments",
                  value: dash.appointments,
                  icon: (
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
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  ),
                  color: "bg-blue-100",
                },
                {
                  label: "Patients",
                  value: dash.patients,
                  icon: (
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
                  ),
                  color: "bg-green-100",
                },
              ].map((s) => (
                <div key={s.label} className="card flex items-center gap-4">
                  <div
                    className={`w-12 h-12 ${s.color} rounded-xl flex items-center justify-center text-xl`}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-dark">{s.value}</p>
                    <p className="text-xs text-muted">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Latest Appointments */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-dark">Latest Appointments</h2>
                <button
                  onClick={() => navigate("/doctor/appointments")}
                  className="text-accent text-xs hover:underline"
                >
                  View All →
                </button>
              </div>
              <div className="space-y-3">
                {(dash.latestAppointments || []).slice(0, 5).map((a) => (
                  <div
                    key={a._id}
                    className="flex items-center gap-3 p-3 bg-surface rounded-lg"
                  >
                    <div className="w-9 h-9 bg-accent/10 rounded-full flex items-center justify-center text-xs font-bold text-accent">
                      {a.userData?.name?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-dark truncate">
                        {a.userData?.name}
                      </p>
                      <p className="text-xs text-muted">
                        {a.slotDate?.replace(/_/g, "/")} · {a.slotTime}
                      </p>
                    </div>
                    {!a.cancelled && !a.isCompleted && (
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => cancelAppointment(a._id)}
                          className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center text-red-600 hover:bg-red-200"
                          title="Cancel"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => completeAppointment(a._id)}
                          className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-green-600 hover:bg-green-200"
                          title="Complete"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth="2"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </button>
                      </div>
                    )}
                    {a.isCompleted && (
                      <span className="badge bg-green-100 text-green-700">
                        Done
                      </span>
                    )}
                    {a.cancelled && (
                      <span className="badge bg-red-100 text-red-600">
                        Cancelled
                      </span>
                    )}
                  </div>
                ))}
                {(!dash.latestAppointments ||
                  dash.latestAppointments.length === 0) && (
                  <p className="text-sm text-muted text-center py-4">
                    No appointments yet
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default DoctorDashboard;
