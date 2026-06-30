import { useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import DoctorSidebar from "../../components/DoctorSidebar";

const categoryColors = {
  "Lab Report": "bg-blue-100 text-blue-700",
  "X-Ray": "bg-purple-100 text-purple-700",
  MRI: "bg-pink-100 text-pink-700",
  "CT Scan": "bg-orange-100 text-orange-700",
  ECG: "bg-red-100 text-red-700",
  Prescription: "bg-green-100 text-green-700",
  Other: "bg-gray-100 text-gray-700",
};

const DoctorPatientRecords = () => {
  const { dToken } = useContext(AppContext);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (dToken) fetchRecords();
  }, [dToken]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/medical-records/doctor-records`,

        {},
        { headers: { dtoken: dToken } },
      );
      if (data.success) setRecords(data.records);
      else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <DoctorSidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">
            Patient Medical Records
          </h1>
          <p className="text-sm text-muted mt-1">
            Records shared with you by your patients
          </p>
        </div>

        {loading ? (
          <div className="card text-center py-16">
            <p className="text-muted text-sm">Loading records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="card text-center py-16">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <p className="font-medium text-dark">No records shared yet</p>
            <p className="text-sm text-muted mt-1">
              Patients can share their medical records with you from their
              Records page
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {records.map((r) => (
              <div
                key={r._id}
                className="card flex items-start gap-3 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary shrink-0">
                  {r.fileType === "pdf" ? (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-dark text-sm truncate">
                    {r.title}
                  </h3>
                  <span
                    className={`badge mt-1 inline-block ${categoryColors[r.category] || "bg-gray-100 text-gray-700"}`}
                  >
                    {r.category}
                  </span>
                  {r.recordDate && (
                    <p className="text-xs text-muted mt-1">
                      Date: {r.recordDate}
                    </p>
                  )}
                  {r.notes && (
                    <p className="text-xs text-muted mt-0.5 truncate">
                      {r.notes}
                    </p>
                  )}
                  <div className="flex gap-3 mt-2">
                    <a
                      href={r.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      View File →
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorPatientRecords;
