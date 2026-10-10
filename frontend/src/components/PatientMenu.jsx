import { NavLink } from "react-router-dom";
import { useContext } from "react";
import { AppContext } from "../context/AppContext";
import { CalendarDays, Pill, FolderOpen, User } from "lucide-react";

const PatientMenu = () => {
  const { token } = useContext(AppContext);
  if (!token) return null;

  const links = [
    { to: "/my-appointments", label: "My Appointments", icon: <CalendarDays size={16} /> },
    { to: "/my-prescriptions", label: "Prescriptions", icon: <Pill size={16} /> },
    { to: "/my-records", label: "Medical Records", icon: <FolderOpen size={16} /> },
    { to: "/my-profile", label: "My Profile", icon: <User size={16} /> },
  ];

  return (
    <div className="bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-1 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted hover:text-dark"
                }`
              }
            >
              <span>{l.icon}</span>
              <span>{l.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PatientMenu;
