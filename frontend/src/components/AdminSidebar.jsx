import { NavLink, useNavigate } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { LayoutDashboard, CalendarDays, Users, UserPlus, Star, LogOut } from "lucide-react";

const AdminSidebar = () => {
  const navigate = useNavigate();
  const { adminLogout } = useContext(AppContext);

  const links = [
    { to: "/admin", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
    { to: "/admin/appointments", label: "Appointments", icon: <CalendarDays size={18} /> },
    { to: "/admin/doctors", label: "Doctors", icon: <Users size={18} /> },
    { to: "/admin/add-doctor", label: "Add Doctor", icon: <UserPlus size={18} /> },
    { to: "/admin/reviews", label: "Reviews", icon: <Star size={18} /> },
  ];

  return (
    <aside className="w-56 min-h-screen bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <div>
            <p className="font-bold text-dark text-sm">MediBook</p>
            <p className="text-xs text-muted">Admin Panel</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-3 space-y-1">
        {links.map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.to === "/admin"}
            className={({ isActive }) =>
              `sidebar-link ${
                isActive
                  ? "bg-primary text-white"
                  : "text-muted hover:bg-surface hover:text-dark"
              }`
            }
          >
            <span>{l.icon}</span>
            <span>{l.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-100">
        <button
          onClick={() => {
            adminLogout();
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

export default AdminSidebar;
