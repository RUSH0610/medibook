import { useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import DoctorSidebar from "../../components/DoctorSidebar";
import { getDoctorAppointments } from "../../services/doctor.service.js";

const emptyMedicine = {
  name: "",
  dosage: "",
  frequency: "",
  duration: "",
  instructions: "",
};

const DoctorPrescriptions = () => {
  const { dToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [medicines, setMedicines] = useState([{ ...emptyMedicine }]);
  const [form, setForm] = useState({
    diagnosis: "",
    labTests: "",
    advice: "",
    followUpDate: "",
    nextVisitIn: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dToken) {
      navigate("/login");
      return;
    }
    fetchData();
  }, [dToken]);

  const fetchData = async () => {
    try {
      const [apptRes, presRes] = await Promise.all([
        getDoctorAppointments(dToken),
        axios.get(`${backendUrl}/api/v1/prescriptions/doctor-list`, {

          headers: { dtoken: dToken },
        }),
      ]);
      if (apptRes.data.success) {
        setAppointments(
          apptRes.data.appointments.filter(
            (a) => a.isCompleted && !a.cancelled,
          ),
        );
      }
      if (presRes.data.success) setPrescriptions(presRes.data.prescriptions);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const addMedicine = () => setMedicines([...medicines, { ...emptyMedicine }]);
  const removeMedicine = (i) =>
    setMedicines(medicines.filter((_, idx) => idx !== i));
  const updateMedicine = (i, field, val) => {
    const updated = [...medicines];
    updated[i][field] = val;
    setMedicines(updated);
  };

  const handleIssue = async () => {
    if (!form.diagnosis) {
      toast.warn("Diagnosis is required");
      return;
    }
    setSaving(true);
    try {
      const labTests = form.labTests
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const { data } = await axios.post(
        `${backendUrl}/api/v1/prescriptions/issue`,

        {
          appointmentId: selected._id,
          patientId: selected.userId,
          patientName: selected.userData?.name,
          patientAge: selected.userData?.dob || "",
          ...form,
          labTests,
          medicines,
        },
        { headers: { dtoken: dToken } },
      );
      if (data.success) {
        toast.success("Prescription issued!");
        setShowForm(false);
        setSelected(null);
        fetchData();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <DoctorSidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">Prescriptions</h1>
          <p className="text-sm text-muted mt-1">
            Issue prescriptions for completed appointments
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Completed appointments - can issue prescription */}
          <div className="card">
            <h2 className="font-semibold text-dark mb-4 text-sm">
              Completed Appointments
            </h2>
            <div className="space-y-2">
              {appointments.length === 0 && (
                <p className="text-sm text-muted">No completed appointments</p>
              )}
              {appointments.map((a) => {
                const alreadyIssued = prescriptions.some(
                  (p) => p.appointmentId === a._id,
                );
                return (
                  <div
                    key={a._id}
                    className="flex items-center justify-between p-3 bg-surface rounded-lg"
                  >
                    <div>
                      <p className="text-sm font-medium text-dark">
                        {a.userData?.name}
                      </p>
                      <p className="text-xs text-muted">
                        {a.slotDate?.replace(/_/g, "/")} · {a.slotTime}
                      </p>
                    </div>
                    {alreadyIssued ? (
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
                        Issued
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          setSelected(a);
                          setShowForm(true);
                        }}
                        className="text-xs btn-primary py-1"
                      >
                        Issue
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Issued prescriptions */}
          <div className="card">
            <h2 className="font-semibold text-dark mb-4 text-sm">
              Issued Prescriptions ({prescriptions.length})
            </h2>
            <div className="space-y-2">
              {prescriptions.length === 0 && (
                <p className="text-sm text-muted">
                  No prescriptions issued yet
                </p>
              )}
              {prescriptions.map((p) => (
                <div key={p._id} className="p-3 bg-surface rounded-lg">
                  <p className="text-sm font-medium text-dark">
                    {p.patientName}
                  </p>
                  <p className="text-xs text-muted">{p.diagnosis}</p>
                  <p className="text-xs text-muted">
                    {p.medicines?.length} medicine(s) ·{" "}
                    {new Date(p.createdAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Issue Prescription Modal */}
        {showForm && selected && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-dark">
                    Issue Prescription — {selected.userData?.name}
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-muted hover:text-dark"
                  >
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
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-medium text-dark block mb-1">
                      Diagnosis *
                    </label>
                    <input
                      value={form.diagnosis}
                      onChange={(e) =>
                        setForm({ ...form, diagnosis: e.target.value })
                      }
                      placeholder="e.g. Viral fever, Type 2 Diabetes"
                      className="input-field"
                    />
                  </div>

                  {/* Medicines */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-dark">
                        Medicines
                      </label>
                      <button
                        onClick={addMedicine}
                        className="text-xs text-primary hover:underline"
                      >
                        + Add Medicine
                      </button>
                    </div>
                    {medicines.map((m, i) => (
                      <div
                        key={i}
                        className="border border-gray-100 rounded-lg p-3 mb-2"
                      >
                        <div className="grid grid-cols-2 gap-2 mb-2">
                          <input
                            value={m.name}
                            onChange={(e) =>
                              updateMedicine(i, "name", e.target.value)
                            }
                            placeholder="Medicine name"
                            className="input-field"
                          />
                          <input
                            value={m.dosage}
                            onChange={(e) =>
                              updateMedicine(i, "dosage", e.target.value)
                            }
                            placeholder="Dosage (e.g. 500mg)"
                            className="input-field"
                          />
                          <input
                            value={m.frequency}
                            onChange={(e) =>
                              updateMedicine(i, "frequency", e.target.value)
                            }
                            placeholder="Frequency (e.g. 1-0-1)"
                            className="input-field"
                          />
                          <input
                            value={m.duration}
                            onChange={(e) =>
                              updateMedicine(i, "duration", e.target.value)
                            }
                            placeholder="Duration (e.g. 5 days)"
                            className="input-field"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            value={m.instructions}
                            onChange={(e) =>
                              updateMedicine(i, "instructions", e.target.value)
                            }
                            placeholder="Instructions (e.g. After meals)"
                            className="input-field flex-1"
                          />
                          <button
                            onClick={() => removeMedicine(i)}
                            className="text-red-500 hover:text-red-700 text-sm"
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
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-dark block mb-1">
                      Lab Tests (comma separated)
                    </label>
                    <input
                      value={form.labTests}
                      onChange={(e) =>
                        setForm({ ...form, labTests: e.target.value })
                      }
                      placeholder="e.g. CBC, Liver Function Test, HbA1c"
                      className="input-field"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-dark block mb-1">
                        Follow-up Date
                      </label>
                      <input
                        type="date"
                        value={form.followUpDate}
                        onChange={(e) =>
                          setForm({ ...form, followUpDate: e.target.value })
                        }
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-dark block mb-1">
                        Next Visit In
                      </label>
                      <input
                        value={form.nextVisitIn}
                        onChange={(e) =>
                          setForm({ ...form, nextVisitIn: e.target.value })
                        }
                        placeholder="e.g. 2 weeks"
                        className="input-field"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-dark block mb-1">
                      Advice
                    </label>
                    <textarea
                      value={form.advice}
                      onChange={(e) =>
                        setForm({ ...form, advice: e.target.value })
                      }
                      placeholder="Diet, rest, and other advice..."
                      rows={2}
                      className="input-field resize-none"
                    />
                  </div>

                  <button
                    onClick={handleIssue}
                    disabled={saving}
                    className="btn-primary w-full py-2.5 disabled:opacity-50"
                  >
                    {saving ? "Issuing..." : "Issue Prescription"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default DoctorPrescriptions;
