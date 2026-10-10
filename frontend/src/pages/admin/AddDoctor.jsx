import { useContext, useState } from "react";
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
  const [showPassword, setShowPassword] = useState(false);
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
    if (form.fees === "" || Number(form.fees) < 0) {
      toast.error("Consultation fees cannot be zero ");
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

      const { data } = await addDoctor(fd);
      if (data.success) {
        toast.success(data.message || "Doctor added!");
        navigate("/admin/doctors");
      } else toast.error(data.message);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Something went wrong";
      toast.error(msg);
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
            <div>
              <label className="text-xs font-medium text-dark block mb-1">Password</label>
              <div className="relative">
                <input
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 characters"
                  className="input-field pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
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
            <div>
              <label className="text-xs font-medium text-dark block mb-1">Consultation Fees (₹)</label>
              <input
                name="fees"
                type="number"
                min="0"
                placeholder="500"
                value={form.fees}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || Number(val) >= 0) setForm({ ...form, fees: val });
                }}
                className="input-field"
              />
            </div>
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
