import { useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, X } from "lucide-react";

const MyPrescriptions = () => {
  const { token } = useContext(AppContext);
  const navigate = useNavigate();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchPrescriptions();
  }, [token]);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/prescriptions/patient-list`,

        {},
        { headers: { token } },
      );
      if (data.success) setPrescriptions(data.prescriptions);
      else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-6 h-6 text-primary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
            />
          </svg>
        </div>
        <p className="text-muted">Loading prescriptions...</p>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-dark mb-6">My Prescriptions</h1>

      {prescriptions.length === 0 ? (
        <div className="card text-center py-14">
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
          <p className="font-medium text-dark">No prescriptions yet</p>
          <p className="text-sm text-muted mt-1">
            Prescriptions appear after your doctor completes the appointment and
            issues one
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {prescriptions.map((p) => (
            <div
              key={p._id}
              onClick={() => setSelected(p)}
              className="card cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-dark text-sm">
                    Dr. {p.doctorName}
                  </h3>
                  <p className="text-xs text-muted">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                  <CheckCircle2 size={14} /> Issued
                </span>
              </div>
              <p className="text-xs text-dark font-medium">
                Diagnosis:{" "}
                <span className="text-muted font-normal">{p.diagnosis}</span>
              </p>
              <p className="text-xs text-muted mt-1">
                {p.medicines?.length || 0} medicine(s) prescribed
              </p>
              {p.followUpDate && (
                <p className="text-xs text-primary mt-2">
                  Follow-up: {p.followUpDate}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-dark">Prescription Details</h2>
                <button
                  onClick={() => setSelected(null)}
                  className="text-muted hover:text-dark text-xl leading-none"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className="bg-surface rounded-lg p-4 text-xs space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted">Doctor</span>
                    <span className="font-medium text-dark">
                      Dr. {selected.doctorName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Patient</span>
                    <span className="font-medium text-dark">
                      {selected.patientName}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Date</span>
                    <span className="font-medium text-dark">
                      {new Date(selected.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Diagnosis</span>
                    <span className="font-medium text-dark">
                      {selected.diagnosis}
                    </span>
                  </div>
                </div>

                {selected.medicines?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-dark mb-2">
                      Medicines
                    </h3>
                    <div className="space-y-2">
                      {selected.medicines.map((m, i) => (
                        <div
                          key={i}
                          className="bg-surface rounded-lg p-3 text-xs"
                        >
                          <p className="font-semibold text-dark">
                            {m.name} — {m.dosage}
                          </p>
                          <p className="text-muted mt-0.5">
                            Frequency: {m.frequency} · Duration: {m.duration}
                          </p>
                          {m.instructions && (
                            <p className="text-muted mt-0.5">
                              Instruction: {m.instructions}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selected.labTests?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-dark mb-2">
                      Lab Tests
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {selected.labTests.map((t) => (
                        <span
                          key={t}
                          className="badge bg-blue-100 text-blue-700"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selected.advice && (
                  <div>
                    <h3 className="text-sm font-semibold text-dark mb-1">
                      Advice
                    </h3>
                    <p className="text-xs text-muted bg-surface rounded-lg p-3">
                      {selected.advice}
                    </p>
                  </div>
                )}

                {selected.followUpDate && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                    Follow-up on: <strong>{selected.followUpDate}</strong>
                    {selected.nextVisitIn && ` (${selected.nextVisitIn})`}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPrescriptions;
