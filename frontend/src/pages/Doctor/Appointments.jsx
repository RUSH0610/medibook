import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import DoctorSidebar from "../../components/DoctorSidebar";
import { getDoctorAppointments, completeAppointment as completeApptService, cancelDoctorAppt } from "../../services/doctor.service.js";

const typeLabel = (t) => {
  if (t === "video")
    return { icon: "📹", label: "Video", cls: "bg-blue-50 text-blue-600" };
  if (t === "phone")
    return {
      icon: "📞",
      label: "Phone",
      cls: "bg-purple-50 text-purple-600",
    };
  return {
    icon: "🏥",
    label: "In-Person",
    cls: "bg-green-50 text-green-600",
  };
};

const DoctorAppointments = () => {
  const { dToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!dToken) {
      navigate("/login");
      return;
    }
    fetchAppointments();
  }, [dToken]);

  const fetchAppointments = async () => {
    try {
      const { data } = await getDoctorAppointments(dToken);
      if (data.success) setAppointments(data.appointments.reverse());
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cancelAppointment = async (id) => {
    try {
      const { data } = await cancelDoctorAppt({ appointmentId: id }, dToken);
      if (data.success) {
        toast.success("Cancelled");
        fetchAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const completeAppointment = async (id) => {
    try {
      const { data } = await completeApptService({ appointmentId: id }, dToken);
      if (data.success) {
        toast.success("Marked as completed");
        fetchAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const filtered = appointments.filter((a) => {
    if (filter === "pending") return !a.cancelled && !a.isCompleted;
    if (filter === "completed") return a.isCompleted;
    if (filter === "cancelled") return a.cancelled;
    return true;
  });

  return (
    <div className="flex min-h-screen bg-surface">
      <DoctorSidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">My Appointments</h1>
          <p className="text-sm text-muted mt-1">{appointments.length} total</p>
        </div>

        <div className="flex gap-2 mb-4">
          {["all", "pending", "completed", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-accent text-white"
                  : "bg-white text-muted border border-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((a) => {
            const tInfo = typeLabel(a.type);
            return (
              <div key={a._id} className="card flex items-start gap-4">
                <div className="w-10 h-10 bg-accent/10 rounded-full flex items-center justify-center text-sm font-bold text-accent shrink-0">
                  {a.userData?.name?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="font-semibold text-dark text-sm">
                        {a.userData?.name}
                      </p>
                      <p className="text-xs text-muted">{a.userData?.email}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Appointment type badge */}
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${tInfo.cls}`}
                      >
                        {tInfo.icon} {tInfo.label}
                      </span>
                      <span
                        className={`badge shrink-0 ${
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
                            ? "Completed"
                            : "Pending"}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted">
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
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
                      {a.slotDate?.replace(/_/g, "/")} · {a.slotTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <svg
                        className="w-3 h-3"
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
                      ₹{a.amount}
                    </span>
                    {/* Phone number for video/phone appointments */}
                    {(a.type === "video" || a.type === "phone") && a.phone && (
                      <span className="flex items-center gap-1 font-medium text-dark">
                        <svg
                          className="w-3 h-3"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                          />
                        </svg>
                        {a.phone}
                      </span>
                    )}
                  </div>
                  {a.reason && (
                    <p className="text-xs text-muted mt-1">
                      Reason: {a.reason}
                    </p>
                  )}
                </div>
                {!a.cancelled && !a.isCompleted && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => cancelAppointment(a._id)}
                      className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => completeAppointment(a._id)}
                      className="text-xs border border-green-200 text-green-600 px-3 py-1.5 rounded-lg hover:bg-green-50"
                    >
                      Complete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="card text-center py-10">
              <p className="text-muted text-sm">No appointments found</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DoctorAppointments;
