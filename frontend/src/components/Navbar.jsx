import { useContext, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import { Link, useNavigate, NavLink } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import axios from "axios";
import { toast } from "react-toastify";

const Navbar = () => {
  const navigate = useNavigate();
  const {
    token,
    userData,
    logout,
    unreadCount,
    notifications,
    loadNotifications,
    } = useContext(AppContext);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/doctors", label: "Find Doctors" },
  ];

  const handleMarkAsRead = async (id, link) => {
    try {
      await axios.post(
        `${backendUrl}/api/v1/notifications/mark-read`,

        { notificationId: id },
        { headers: { token } },
      );
      loadNotifications();
      if (link) {
        setNotifOpen(false);
        navigate(link);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.post(
        `${backendUrl}/api/v1/notifications/mark-all-read`,

        { recipientId: userData._id },
        { headers: { token } },
      );
      loadNotifications();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">M</span>
          </div>
          <span className="font-bold text-lg text-dark">MediBook</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `text-sm font-medium transition-colors ${
                  isActive ? "text-primary" : "text-muted hover:text-dark"
                }`
              }
              end
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {token && userData ? (
            <>
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setNotifOpen(!notifOpen);
                    setDropOpen(false);
                  }}
                  className="p-2 relative hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
                >
                  <svg
                    className="w-6 h-6 text-dark"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 flex items-center justify-between border-b border-gray-100">
                      <h3 className="font-bold text-dark">Notifications</h3>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllRead}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-[70vh] overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-center text-sm text-muted py-8">
                          No notifications yet
                        </p>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n._id}
                            onClick={() => handleMarkAsRead(n._id, n.link)}
                            className={`px-4 py-3 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors ${
                              !n.isRead ? "bg-blue-50/30" : ""
                            }`}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <p
                                className={`text-sm ${!n.isRead ? "font-bold text-dark" : "font-semibold text-gray-700"}`}
                              >
                                {n.title}
                              </p>
                              {!n.isRead && (
                                <span className="w-2 h-2 bg-primary rounded-full mt-1.5 shrink-0"></span>
                              )}
                            </div>
                            <p className="text-xs text-muted leading-relaxed">
                              {n.message}
                            </p>
                            <p className="text-[10px] text-gray-400 mt-2 font-medium">
                              {new Date(n.createdAt).toLocaleDateString()} ·{" "}
                              {new Date(n.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => {
                    setDropOpen(!dropOpen);
                    setNotifOpen(false);
                  }}
                  className="flex items-center gap-2 bg-surface px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors focus:outline-none"
                >
                  <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                    {userData.name ? userData.name.charAt(0).toUpperCase() : "U"}

                  </div>
                  <span className="text-sm font-medium hidden sm:block">
                    {userData.name ? userData.name.split(" ")[0] : "User"}

                  </span>
                  <svg
                    className="w-4 h-4 text-muted"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {dropOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    {[
                      { to: "/my-profile", label: "My Profile" },
                      { to: "/my-appointments", label: "My Appointments" },
                      { to: "/my-prescriptions", label: "Prescriptions" },
                      { to: "/my-records", label: "Medical Records" },
                    ].map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={() => setDropOpen(false)}
                        className="block px-4 py-2.5 text-sm text-dark hover:bg-surface transition-colors"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <hr className="my-1 border-gray-100" />
                    <button
                      onClick={() => {
                        logout();
                        setDropOpen(false);
                        navigate("/login");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button onClick={() => navigate("/login")} className="btn-primary">
              Login
            </button>
          )}

          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden p-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  menuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"
                }
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-2">
          {navLinks.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              onClick={() => setMenuOpen(false)}
              className="block py-2 text-sm font-medium text-dark hover:text-primary"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
