import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { loginUser, registerUser } from "../services/user.service.js";
import { loginDoctor } from "../services/doctor.service.js";
import { loginAdmin } from "../services/admin.service.js";


const Login = () => {
  const navigate = useNavigate();
  const { setToken, setAToken, setDToken } = useContext(AppContext);

  const [role, setRole] = useState("patient"); // patient | doctor | admin
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (role === "patient") {
        if (isLogin) {
          const { data } = await loginUser({
            email: form.email,
            password: form.password,
          });
          if (data.success) {
            localStorage.setItem("token", data.token);
            setToken(data.token);
            navigate("/");
          } else toast.error(data.message);
        } else {
          const { data } = await registerUser({
            name: form.name,
            email: form.email,
            password: form.password,
          });
          if (data.success) {
            localStorage.setItem("token", data.token);
            setToken(data.token);
            navigate("/");
          } else toast.error(data.message);
        }
      } else if (role === "admin") {
        const { data } = await loginAdmin({
          email: form.email,
          password: form.password,
        });
        if (data.success) {
          localStorage.setItem("aToken", data.token);
          setAToken(data.token);
          navigate("/admin");
        } else toast.error(data.message);
      } else if (role === "doctor") {
        const { data } = await loginDoctor({
          email: form.email,
          password: form.password,
        });
        if (data.success) {
          localStorage.setItem("dToken", data.token);
          setDToken(data.token);
          navigate("/doctor/dashboard");
        } else toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "patient", label: "Patient" },
    { id: "doctor", label: "Doctor" },
    { id: "admin", label: "Admin" },
  ];

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-md w-full max-w-md p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center mx-auto mb-3">
            <span className="text-white font-bold">M</span>
          </div>
          <h1 className="text-xl font-bold text-dark">Welcome to MediBook</h1>
          <p className="text-sm text-muted mt-1">
            {isLogin ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {/* Role Tabs */}
        <div className="flex bg-surface rounded-lg p-1 mb-6">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setRole(t.id);
                setIsLogin(true);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                role === t.id
                  ? "bg-white shadow text-primary"
                  : "text-muted hover:text-dark"
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Form */}
        <div className="space-y-4">
          {role === "patient" && !isLogin && (
            <div>
              <label className="text-xs font-medium text-dark block mb-1">
                Full Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-dark block mb-1">
              Email Address
            </label>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="input-field"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-dark block mb-1">
              Password
            </label>
            <input
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="input-field"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="btn-primary w-full py-2.5 text-center disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : isLogin
                ? "Sign In"
                : "Create Account"}
          </button>
        </div>

        {/* Toggle login/register */}
        {role === "patient" && (
          <p className="text-center text-xs text-muted mt-5">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-medium hover:underline"
            >
              {isLogin ? "Sign Up" : "Sign In"}
            </button>
          </p>
        )}

        {role !== "patient" && (
          <p className="text-center text-xs text-muted mt-4">
            {role === "admin"
              ? "Admin accounts are managed by the system."
              : "Doctor accounts are created by admin."}
          </p>
        )}
      </div>
    </div>
  );
};

export default Login;
