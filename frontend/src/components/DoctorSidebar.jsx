import { NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { LayoutDashboard, CalendarDays, Pill, FolderOpen, User, LogOut } from "lucide-react";

const DoctorSidebar = () => {
  const navigate = useNavigate();
  const { doctorLogout } = useContext(AppContext);

  const links = [
    { to: "/doctor/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/doctor/appointments", label: "Appointments", icon: <CalendarDays size={18} /> },
    { to: "/doctor/prescriptions", label: "Prescriptions", icon: <Pill size={18} /> },
    { to: "/doctor/patient-records", label: "Patient Records", icon: <FolderOpen size={18} /> },
    { to: "/doctor/profile", label: "My Profile", icon: <User size={18} /> },
  ];

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <p className="font-bold text-dark text-sm">MediBook</p>
            <p className="text-xs text-muted">Doctor Panel</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            className={({ isActive }) =>
              `sidebar-link ${
                isActive
                  ? "bg-accent text-white"
                  : "text-muted hover:bg-surface hover:text-dark"
              }`
            }
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => {
            doctorLogout();
            navigate("/login");
          }}
          className="sidebar-link text-red-500 hover:bg-red-50 w-full"
        >
          <span><LogOut size={18} /></span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default DoctorSidebar;
