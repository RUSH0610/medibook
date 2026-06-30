import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import DoctorSidebar from "../../components/DoctorSidebar";
import { getDoctorProfile, updateDoctorProfile } from "../../services/doctor.service.js";

const DoctorProfile = () => {
  const { dToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!dToken) {
      navigate("/login");
      return;
    }
    fetchProfile();
  }, [dToken]);

  const fetchProfile = async () => {
    try {
      const { data } = await getDoctorProfile(dToken);
      if (data.success) {
        setProfile(data.profileData);
        setForm(data.profileData);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data } = await updateDoctorProfile(
        { fees: form.fees, address: form.address, available: form.available },
        dToken,
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
      <div className="flex min-h-screen bg-surface">
        <DoctorSidebar />
        <main className="flex-1 p-6 flex items-center justify-center">
          <p className="text-muted">Loading profile...</p>
        </main>
      </div>
    );

  return (
    <div className="flex min-h-screen bg-surface">
      <DoctorSidebar />
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-dark">My Profile</h1>
            <p className="text-sm text-muted mt-1">
              Manage your profile and availability
            </p>
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
            <button
              onClick={() => setEdit(true)}
              className="btn-outline text-sm"
            >
              Edit
            </button>
          )}
        </div>

        <div className="space-y-6 max-w-3xl">
          {/* Profile Card */}
          <div className="card flex flex-col sm:flex-row gap-6">
            <img
              src={profile.image}
              alt={profile.name}
              className="w-28 h-28 rounded-xl object-cover bg-surface"
            />
            <div className="flex-1">
              <h2 className="text-xl font-bold text-dark">{profile.name}</h2>
              <p className="text-sm text-muted">
                {profile.degree} · {profile.speciality}
              </p>
              <p className="text-xs text-muted mt-1">{profile.experience} experience</p>

              {/* Availability toggle */}
              <div className="mt-4">
                <label className="flex items-center gap-3 cursor-pointer w-fit">
                  <div
                    onClick={() =>
                      edit &&
                      setForm({ ...form, available: !form.available })
                    }
                    className={`w-9 h-5 rounded-full transition-colors relative ${
                      (edit ? form.available : profile.available)
                        ? "bg-green-400"
                        : "bg-gray-300"
                    } ${edit ? "cursor-pointer" : "cursor-default"}`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        (edit ? form.available : profile.available)
                          ? "translate-x-4"
                          : "translate-x-0.5"
                      }`}
                    ></span>
                  </div>
                  <span className="text-xs text-muted">
                    {(edit ? form.available : profile.available)
                      ? "Available"
                      : "Unavailable"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="card">
            <h3 className="font-semibold text-dark mb-4 text-sm">
              Professional Details
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted">Email</p>
                <p className="font-medium text-dark mt-0.5">{profile.email}</p>
              </div>
              <div>
                <p className="text-xs text-muted">License Number</p>
                <p className="font-medium text-dark mt-0.5">
                  {profile.licenseNumber || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Consultation Fee</p>
                {edit ? (
                  <input
                    type="number"
                    value={form.fees}
                    onChange={(e) => setForm({ ...form, fees: e.target.value })}
                    className="input-field"
                  />
                ) : (
                  <p className="font-medium text-dark">₹{profile.fees}</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted">Rating</p>
                <p className="font-medium text-dark mt-0.5 flex items-center gap-1">
                  {profile.avgRating > 0 ? (
                    <>
                      <svg
                        className="w-3 h-3 text-yellow-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {profile.avgRating} ({profile.totalReviews} reviews)
                    </>
                  ) : (
                    "No reviews yet"
                  )}
                </p>
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="font-semibold text-dark mb-3 text-sm">About</h3>
            <p className="text-sm text-muted leading-relaxed">
              {profile.about}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                label: "Total Appointments",
                val: profile.totalAppointments || 0,
              },
              { label: "Completed", val: profile.completedAppointments || 0 },
              {
                label: "Total Earnings",
                val: `₹${profile.totalEarnings || 0}`,
              },
            ].map((s) => (
              <div key={s.label} className="card text-center">
                <p className="text-xl font-bold text-dark">{s.val}</p>
                <p className="text-xs text-muted mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};

export default DoctorProfile;
