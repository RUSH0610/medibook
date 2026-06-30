import { useContext, useEffect, useState } from "react";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { getUserProfile, updateUserProfile } from "../services/user.service.js";
import { BLOOD_GROUPS } from "../constants";

const MyProfile = () => {
  const { token } = useContext(AppContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchProfile();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const { data } = await getUserProfile(token);
      if (data.success) {
        setProfile(data.userData);
        setForm(data.userData);
      } else {
        toast.error(data.message || "Failed to load profile");
      }
    } catch (err) {
      toast.error("Could not load profile. Please try again.");
      console.error("fetchProfile error:", err.message);
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await updateUserProfile(
        {
          name: form.name,
          phone: form.phone,
          gender: form.gender,
          dob: form.dob,
          bloodGroup: form.bloodGroup,
          address: form.address,
          insuranceProvider: form.insuranceProvider,
          insurancePolicyNo: form.insurancePolicyNo,
        },
        token,
      );
      if (data.success) {
        toast.success("Profile updated!");
        setEdit(false);
        fetchProfile();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!profile)
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-muted">Loading profile...</p>
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="card flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-2xl font-bold text-primary">
            {profile.name ? profile.name.charAt(0).toUpperCase() : "U"}

          </div>
          <div>
            <h1 className="text-xl font-bold text-dark">{profile.name}</h1>
            <p className="text-sm text-muted">{profile.email}</p>
          </div>
        </div>
        {edit ? (
          <div className="flex gap-2">
            <button
              onClick={() => setEdit(false)}
              className="btn-outline text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save"}
            </button>
          </div>
        ) : (
          <button onClick={() => setEdit(true)} className="btn-outline text-sm">
            Edit
          </button>
        )}
      </div>

      {/* Personal Info */}
      <div className="card">
        <h2 className="font-semibold text-dark mb-4 text-sm">
          Personal Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Full Name", name: "name" },
            { label: "Phone", name: "phone" },
          ].map(({ label, name }) => (
            <div key={name}>
              <label className="text-xs font-medium text-muted block mb-1">
                {label}
              </label>
              {edit ? (
                <input
                  name={name}
                  value={form[name] || ""}
                  onChange={handleChange}
                  className="input-field"
                />
              ) : (
                <p className="text-sm text-dark py-1">
                  {profile[name] || (
                    <span className="text-gray-300">Not set</span>
                  )}
                </p>
              )}
            </div>
          ))}

          <div>
            <label className="text-xs font-medium text-muted block mb-1">
              Address
            </label>
            {edit ? (
              <div className="space-y-2">
                <input
                  value={form.address?.line1 || ""}
                  onChange={(e) => setForm({ ...form, address: { ...form.address, line1: e.target.value } })}
                  placeholder="Address Line 1"
                  className="input-field"
                />
                <input
                  value={form.address?.line2 || ""}
                  onChange={(e) => setForm({ ...form, address: { ...form.address, line2: e.target.value } })}
                  placeholder="Address Line 2"
                  className="input-field"
                />
              </div>
            ) : (
              <p className="text-sm text-dark py-1">
                {profile.address?.line1 || profile.address?.line2 ? (
                  <>
                    {profile.address.line1}
                    <br />
                    {profile.address.line2}
                  </>
                ) : (
                  <span className="text-gray-300">Not set</span>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">
              Date of Birth
            </label>
            {edit ? (
              <input
                name="dob"
                type="date"
                value={form.dob || ""}
                onChange={handleChange}
                className="input-field"
              />
            ) : (
              <p className="text-sm text-dark py-1">
                {profile.dob || (
                  <span className="text-gray-300">Not set</span>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">
              Gender
            </label>
            {edit ? (
              <select
                name="gender"
                value={form.gender || ""}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            ) : (
              <p className="text-sm text-dark py-1">
                {profile.gender || (
                  <span className="text-gray-300">Not set</span>
                )}
              </p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-muted block mb-1">
              Blood Group
            </label>
            {edit ? (
              <select
                name="bloodGroup"
                value={form.bloodGroup || ""}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Select</option>
                {BLOOD_GROUPS.map(
                  (g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ),
                )}
              </select>
            ) : (
              <p className="text-sm text-dark py-1">
                {profile.bloodGroup || (
                  <span className="text-gray-300">Not set</span>
                )}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Insurance */}
      <div className="card">
        <h2 className="font-semibold text-dark mb-4 text-sm">
          Insurance Information
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Insurance Provider", name: "insuranceProvider" },
            { label: "Policy Number", name: "insurancePolicyNo" },
          ].map(({ label, name }) => (
            <div key={name}>
              <label className="text-xs font-medium text-muted block mb-1">
                {label}
              </label>
              {edit ? (
                <input
                  name={name}
                  value={form[name] || ""}
                  onChange={handleChange}
                  placeholder={`Enter ${label.toLowerCase()}`}
                  className="input-field"
                />
              ) : (
                <p className="text-sm text-dark py-1">
                  {profile[name] || (
                    <span className="text-gray-300">Not set</span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Medical Info */}
      {(profile.allergies?.length > 0 ||
        profile.chronicConditions?.length > 0) && (
        <div className="card">
          <h2 className="font-semibold text-dark mb-4 text-sm">
            Medical Information
          </h2>
          {profile.allergies?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-muted mb-2">Allergies</p>
              <div className="flex flex-wrap gap-2">
                {profile.allergies.map((a) => (
                  <span key={a} className="badge bg-red-100 text-red-600">
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {profile.chronicConditions?.length > 0 && (
            <div>
              <p className="text-xs text-muted mb-2">Chronic Conditions</p>
              <div className="flex flex-wrap gap-2">
                {profile.chronicConditions.map((c) => (
                  <span
                    key={c}
                    className="badge bg-orange-100 text-orange-600"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MyProfile;
