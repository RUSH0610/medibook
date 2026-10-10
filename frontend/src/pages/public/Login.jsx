import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import { login, register, verifyOTP } from "../../services/auth.service.js";


const Login = () => {
  const navigate = useNavigate();
  const { setToken, setAToken, setDToken } = useContext(AppContext);

  const [role, setRole] = useState("patient"); // patient | doctor | admin
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState("register"); // "register" | "otp"
  const [otpValue, setOtpValue] = useState("");
  const [registrationEmail, setRegistrationEmail] = useState("");

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (role === "patient") {
        if (isLogin) {
          const { data } = await login({
            email: form.email,
            password: form.password,
          });
          if (data.success) {
            localStorage.setItem("token", data.data.accessToken);
            setToken(data.data.accessToken);
            navigate("/");
          } else toast.error(data.message);
        } else {
          const { data } = await register({ name: form.name, email: form.email, password: form.password });
          if (data.success) {
            setRegistrationEmail(form.email);
            setStep("otp");
            toast.success("OTP sent to your email");
          } else toast.error(data.message);
        }
      } else if (role === "admin") {
        const { data } = await login({
          email: form.email,
          password: form.password,
        });
        if (data.success) {
          localStorage.setItem("aToken", data.data.accessToken);
          setAToken(data.data.accessToken);
          navigate("/admin");
        } else toast.error(data.message);
      } else if (role === "doctor") {
        const { data } = await login({
          email: form.email,
          password: form.password,
        });
        if (data.success) {
          localStorage.setItem("dToken", data.data.accessToken);
          setDToken(data.data.accessToken);
          navigate("/doctor/dashboard");
        } else toast.error(data.message);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const { data } = await verifyOTP({ email: registrationEmail, otp: otpValue });
      if (data.success) {
        localStorage.setItem("token", data.data.accessToken);
        setToken(data.data.accessToken);
        toast.success("Account created successfully!");
        navigate("/");
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      const msg = error?.response?.data?.message || "Invalid OTP";
      toast.error(msg);
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

        {step === "otp" && role === "patient" && !isLogin ? (
          <div className="flex flex-col gap-4">
            <p className="text-center text-gray-600">
              Enter the 6-digit OTP sent to <strong>{registrationEmail}</strong>
            </p>

            <input
              type="text"
              maxLength={6}
              value={otpValue}
              onChange={(e) => setOtpValue(e.target.value.replace(/\D/g, ""))}
              placeholder="Enter 6-digit OTP"
              className="border rounded px-4 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            <button
              onClick={handleVerifyOTP}
              className="bg-primary text-white py-2 rounded font-medium hover:bg-primary/90 transition"
            >
              Verify OTP
            </button>
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => setStep("register")}
                className="text-sm text-gray-500 hover:text-gray-700 underline text-center transition"
              >
                Back to registration
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="text-sm text-primary hover:text-primary/80 underline text-center transition disabled:opacity-60"
              >
                {loading ? "Sending..." : "Resend OTP"}
              </button>
            </div>
          </div>
        ) : (
          <>
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
            <div className="relative">
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
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
              onClick={() => {
                setIsLogin(!isLogin);
                setStep("register");
              }}
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
          </>
        )}
      </div>
    </div>
  );
};

export default Login;
