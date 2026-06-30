import { useContext, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import { useNavigate } from "react-router-dom";
import { addDoctor } from "../../services/admin.service.js";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import AdminSidebar from "../../components/AdminSidebar";

import { SPECIALITIES } from "../../constants/index.js";

const specialities = SPECIALITIES;
const experiences = [
  "1 Year",
  "2 Years",
  "3 Years",
  "4 Years",
  "5 Years",
  "6 Years",
  "7 Years",
  "8 Years",
  "9 Years",
  "10+ Years",
];

// Defined OUTSIDE the component — fixes the input deselect bug
const Field = ({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
}) => (
  <div>
    <label className="text-xs font-medium text-dark block mb-1">{label}</label>
    <input
      name={name}
      value={value}
      onChange={onChange}
      type={type}
      placeholder={placeholder}
      className="input-field"
    />
  </div>
);

const AdminAddDoctor = () => {
  const { aToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    speciality: "General Physician",
    degree: "",
    experience: "1 Year",
    about: "",
    fees: "",
    address1: "",
    address2: "",
    licenseNumber: "",
  });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    if (!image) {
      toast.warn("Please select doctor image");
      return;
    }
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("image", image);
      Object.entries(form).forEach(([k, v]) => {
        if (k === "address1" || k === "address2") return;
        fd.append(k, v);
      });
      fd.append(
        "address",
        JSON.stringify({ line1: form.address1, line2: form.address2 }),
      );

      const { data } = await addDoctor(fd, aToken);
      if (data.success) {
        toast.success("Doctor added!");
        navigate("/admin/doctors");
      } else toast.error(data.message);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">Add New Doctor</h1>
          <p className="text-sm text-muted mt-1">
            Fill in the details to register a new doctor
          </p>
        </div>

        <div className="card max-w-3xl">
          {/* Image upload */}
          <div className="mb-6">
            <label className="text-xs font-medium text-dark block mb-2">
              Doctor Photo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-xl bg-surface border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                {image ? (
                  <img
                    src={URL.createObjectURL(image)}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg
                    className="w-8 h-8 text-gray-400"
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
                )}
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                className="text-xs text-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Full Name"
              name="name"
              placeholder="Dr. Jane Smith"
              value={form.name}
              onChange={handleChange}
            />
            <Field
              label="Email"
              name="email"
              type="email"
              placeholder="doctor@medibook.com"
              value={form.email}
              onChange={handleChange}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              placeholder="Min 8 characters"
              value={form.password}
              onChange={handleChange}
            />
            <Field
              label="License Number"
              name="licenseNumber"
              placeholder="MED-2024-XXXX"
              value={form.licenseNumber}
              onChange={handleChange}
            />

            <div>
              <label className="text-xs font-medium text-dark block mb-1">
                Speciality
              </label>
              <select
                name="speciality"
                value={form.speciality}
                onChange={handleChange}
                className="input-field"
              >
                {specialities.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-dark block mb-1">
                Experience
              </label>
              <select
                name="experience"
                value={form.experience}
                onChange={handleChange}
                className="input-field"
              >
                {experiences.map((e) => (
                  <option key={e}>{e}</option>
                ))}
              </select>
            </div>

            <Field
              label="Degree"
              name="degree"
              placeholder="MBBS, MD"
              value={form.degree}
              onChange={handleChange}
            />
            <Field
              label="Consultation Fees (₹)"
              name="fees"
              type="number"
              placeholder="500"
              value={form.fees}
              onChange={handleChange}
            />
            <Field
              label="Address Line 1"
              name="address1"
              placeholder="Clinic / Hospital name"
              value={form.address1}
              onChange={handleChange}
            />
            <Field
              label="Address Line 2"
              name="address2"
              placeholder="City, State"
              value={form.address2}
              onChange={handleChange}
            />
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-dark block mb-1">
              About Doctor
            </label>
            <textarea
              name="about"
              value={form.about}
              onChange={handleChange}
              placeholder="Brief description of the doctor's expertise and background..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => navigate("/admin/doctors")}
              className="btn-outline"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="btn-primary disabled:opacity-50"
            >
              {loading ? "Adding..." : "Add Doctor"}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAddDoctor;
