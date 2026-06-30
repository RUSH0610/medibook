import { useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import { useNavigate } from "react-router-dom";
import { getAllDoctors, changeAvailability } from "../../services/admin.service.js";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import AdminSidebar from "../../components/AdminSidebar";

const AdminDoctors = () => {
  const { aToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [doctors, setDoctors] = useState([]);

  useEffect(() => {
    if (!aToken) {
      navigate("/login");
      return;
    }
    fetchDoctors();
  }, [aToken]);

  const fetchDoctors = async () => {
    try {
      const { data } = await getAllDoctors(aToken);
      if (data.success) setDoctors(data.doctors);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleAvailability = async (docId) => {
    try {
      const { data } = await changeAvailability({ docId }, aToken);
      if (data.success) {
        toast.success("Updated");
        fetchDoctors();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-dark">Doctors</h1>
            <p className="text-sm text-muted mt-1">
              {doctors.length} registered doctors
            </p>
          </div>
          <button
            onClick={() => navigate("/admin/add-doctor")}
            className="btn-primary"
          >
            + Add Doctor
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {doctors.map((doc) => (
            <div key={doc._id} className="card">
              <div className="flex items-start gap-3 mb-3">
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-14 h-14 rounded-xl object-cover bg-surface shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-dark text-sm truncate">
                    {doc.name}
                  </h3>
                  <p className="text-xs text-muted">{doc.speciality}</p>
                  <p className="text-xs text-muted">{doc.experience}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted">
                  Fee:{" "}
                  <span className="font-medium text-dark">₹{doc.fees}</span>
                </span>
                {doc.avgRating > 0 && (
                  <span className="flex items-center gap-1 text-muted">
                    <svg
                      className="w-3 h-3 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {doc.avgRating}
                  </span>
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <div
                    onClick={() => toggleAvailability(doc._id)}
                    className={`w-9 h-5 rounded-full transition-colors relative ${doc.available ? "bg-green-400" : "bg-gray-300"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${doc.available ? "translate-x-4" : "translate-x-0.5"}`}
                    ></span>
                  </div>
                  <span className="text-xs text-muted">
                    {doc.available ? "Available" : "Unavailable"}
                  </span>
                </label>
                {doc.isVerified && (
                  <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
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
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    Verified
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AdminDoctors;
