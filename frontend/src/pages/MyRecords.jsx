import { useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Link2, X, FileText } from "lucide-react";

const categories = [
  "Lab Report",
  "Prescription",
  "X-Ray",
  "MRI",
  "CT Scan",
  "ECG",
  "Other",
];
const categoryColors = {
  "Lab Report": "bg-blue-100 text-blue-700",
  "X-Ray": "bg-purple-100 text-purple-700",
  MRI: "bg-pink-100 text-pink-700",
  "CT Scan": "bg-orange-100 text-orange-700",
  ECG: "bg-red-100 text-red-700",
  Prescription: "bg-green-100 text-green-700",
  Other: "bg-gray-100 text-gray-700",
};

const MyRecords = () => {
  const { token, doctors } = useContext(AppContext);
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [form, setForm] = useState({
    title: "",
    category: "Lab Report",
    notes: "",
    recordDate: "",
  });
  const [uploading, setUploading] = useState(false);

  // Share modal state
  const [shareTarget, setShareTarget] = useState(null); // record being shared
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchRecords();
  }, [token]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/medical-records/list`,

        {},
        { headers: { token } },
      );
      if (data.success) setRecords(data.records);
      else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!file || !form.title) {
      toast.warn("Title and file are required");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", form.title);
      fd.append("category", form.category);
      fd.append("notes", form.notes);
      fd.append("recordDate", form.recordDate);
      const { data } = await axios.post(
        `${backendUrl}/api/v1/medical-records/upload`,

        fd,
        {
          headers: { token },
        },
      );
      if (data.success) {
        toast.success("Record uploaded!");
        setShowUpload(false);
        setForm({
          title: "",
          category: "Lab Report",
          notes: "",
          recordDate: "",
        });
        setFile(null);
        fetchRecords();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteRecord = async (id) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/medical-records/delete`,

        { recordId: id },
        { headers: { token } },
      );
      if (data.success) {
        toast.success("Deleted");
        fetchRecords();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleShare = async () => {
    if (!selectedDoctor) {
      toast.warn("Please select a doctor");
      return;
    }
    setSharing(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/medical-records/share`,

        { recordId: shareTarget._id, doctorId: selectedDoctor },
        { headers: { token } },
      );
      if (data.success) {
        toast.success("Record shared with doctor!");
        setShareTarget(null);
        setSelectedDoctor("");
        fetchRecords();
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSharing(false);
    }
  };

  if (loading)
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </div>
        <p className="text-muted">Loading records...</p>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark">Medical Records</h1>
          <p className="text-sm text-muted mt-1">
            {records.length} records stored
          </p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary">
          + Upload Record
        </button>
      </div>

      {records.length === 0 ? (
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
          <p className="font-medium text-dark">No records yet</p>
          <p className="text-sm text-muted mt-1">
            Upload your lab reports, X-rays, and other medical documents
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="btn-primary mt-4"
          >
            Upload First Record
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {records.map((r) => (
            <div key={r._id} className="card flex items-start gap-3">
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

                {/* Shared with doctors indicator */}
                {r.sharedWithDoctors?.length > 0 && (
                  <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 size={14} /> Shared with {r.sharedWithDoctors.length} doctor
                    {r.sharedWithDoctors.length > 1 ? "s" : ""}
                  </p>
                )}

                <div className="flex gap-3 mt-2 flex-wrap">
                  <a
                    href={r.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    View File
                  </a>
                  <button
                    onClick={() => {
                      setShareTarget(r);
                      setSelectedDoctor("");
                    }}
                    className="text-xs text-blue-500 hover:underline font-medium"
                  >
                    <Link2 size={14} className="inline mr-1" /> Share with Doctor
                  </button>
                  <button
                    onClick={() => deleteRecord(r._id)}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-dark">Upload Medical Record</h2>
              <button
                onClick={() => setShowUpload(false)}
                className="text-muted hover:text-dark text-xl leading-none"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-dark block mb-1">
                  Title *
                </label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Blood Test Report"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-dark block mb-1">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) =>
                    setForm({ ...form, category: e.target.value })
                  }
                  className="input-field"
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-dark block mb-1">
                  Record Date
                </label>
                <input
                  type="date"
                  value={form.recordDate}
                  onChange={(e) =>
                    setForm({ ...form, recordDate: e.target.value })
                  }
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-dark block mb-1">
                  Notes (optional)
                </label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Any notes about this record"
                  className="input-field"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-dark block mb-1">
                  File (PDF or Image) *
                </label>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="input-field"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShowUpload(false)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : "Upload"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share with Doctor Modal */}
      {shareTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-dark">Share with a Doctor</h2>
              <button
                onClick={() => setShareTarget(null)}
                className="text-muted hover:text-dark text-xl leading-none"
              >
                <X size={20} />
              </button>
            </div>

            {/* Record being shared */}
            <div className="bg-surface rounded-xl p-3 mb-4 flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <FileText size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-dark">
                  {shareTarget.title}
                </p>
                <p className="text-xs text-muted">{shareTarget.category}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-dark block mb-1">
                  Select Doctor *
                </label>
                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Choose a doctor --</option>
                  {doctors
                    .filter((d) => d.available)
                    .map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.name} · {d.speciality}
                      </option>
                    ))}
                </select>
              </div>

              {/* Already shared with indicator */}
              {shareTarget.sharedWithDoctors?.length > 0 && (
                <p className="text-xs text-muted">
                  Already shared with:{" "}
                  {shareTarget.sharedWithDoctors
                    .map((id) => {
                      const doc = doctors.find((d) => d._id === id);
                      return doc ? doc.name : "Unknown";
                    })
                    .join(", ")}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setShareTarget(null)}
                  className="btn-outline flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleShare}
                  disabled={sharing || !selectedDoctor}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  {sharing ? "Sharing..." : "Share Record"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRecords;
