import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import AdminSidebar from "../../components/AdminSidebar";
import { getAdminAppointments, cancelAdminAppt } from "../../services/admin.service.js";

const AdminAppointments = () => {
  const { aToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!aToken) {
      navigate("/login");
      return;
    }
    fetchAppointments();
  }, [aToken]);

  const fetchAppointments = async () => {
    try {
      const { data } = await getAdminAppointments(aToken);
      if (data.success) setAppointments(data.appointments.reverse());
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cancelAppointment = async (id) => {
    try {
      const { data } = await cancelAdminAppt({ appointmentId: id }, aToken);
      if (data.success) {
        toast.success("Appointment cancelled");
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
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">All Appointments</h1>
          <p className="text-sm text-muted mt-1">
            {appointments.length} total appointments
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-4">
          {["all", "pending", "completed", "cancelled"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filter === f
                  ? "bg-primary text-white"
                  : "bg-white text-muted border border-gray-200 hover:border-primary"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface border-b border-gray-100">
                  {[
                    "#",
                    "Patient",
                    "Doctor",
                    "Date & Time",
                    "Type",
                    "Amount",
                    "Status",
                    "Action",
                  ].map((h) => (
                    <th
                      key={h}
                      className="text-left px-4 py-3 font-medium text-muted"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((a, i) => (
                  <tr
                    key={a._id}
                    className="hover:bg-surface transition-colors"
                  >
                    <td className="px-4 py-3 text-muted">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                          {a.userData?.name?.charAt(0)}
                        </div>
                        <span className="font-medium text-dark">
                          {a.userData?.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <img
                          src={a.docData?.image}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover bg-gray-200"
                        />
                        <span className="text-dark">{a.docData?.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {a.slotDate?.replace(/_/g, "/")} · {a.slotTime}
                    </td>
                    <td className="px-4 py-3 capitalize text-muted">
                      {a.type || "in-person"}
                    </td>
                    <td className="px-4 py-3 font-medium text-dark">
                      ₹{a.amount}
                    </td>
                    <td className="px-4 py-3">
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
                            ? "Completed"
                            : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {!a.cancelled && !a.isCompleted && (
                        <button
                          onClick={() => cancelAppointment(a._id)}
                          className="text-red-500 hover:underline text-xs"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <p className="text-center text-muted py-8 text-sm">
                No appointments found
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAppointments;
