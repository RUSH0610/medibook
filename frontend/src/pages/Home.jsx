import { useContext, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

import { SPECIALITIES } from "../constants/index.js";

const specialities = SPECIALITIES.map(name => ({ name }));

const Home = () => {
  const navigate = useNavigate();
  const { doctors, getDoctors } = useContext(AppContext);

  // Re-fetch doctors every time Home page is visited
  useEffect(() => {
    getDoctors();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-14">
      {/* Hero */}
      <section className="bg-primary rounded-2xl p-8 md:p-12 text-white flex flex-col md:flex-row items-center gap-8">
        <div className="flex-1 space-y-4">
          <span className="bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">
            #1 Doctor Booking Platform
          </span>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            Book Appointments <br /> with Top Doctors
          </h1>
          <p className="text-blue-100 text-sm leading-relaxed max-w-md">
            Find and book appointments with the best doctors near you. Simple,
            fast, and reliable healthcare at your fingertips.
          </p>
          <button
            onClick={() => navigate("/doctors")}
            className="bg-white text-primary font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors text-sm"
          >
            Find a Doctor →
          </button>
        </div>
        <div className="hidden md:flex flex-col gap-3">
          {[
            "500+ Verified Doctors",
            "Easy Scheduling",
            "Digital Prescriptions",
            "Medical Records",
          ].map((item) => (
            <div
              key={item}
              className="bg-white/10 rounded-lg px-4 py-2 text-sm font-medium"
            >
              {item}
            </div>
          ))}
        </div>
      </section>

      {/* Specialities */}
      <section>
        <div className="mb-6">
          <h2 className="text-xl font-bold text-dark">Browse by Speciality</h2>
          <p className="text-sm text-muted mt-1">
            Click on a speciality to find available doctors
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          {specialities.map((s) => (
            <button
              key={s.name}
              onClick={() => navigate(`/doctors/${s.name}`)}
              className="card flex flex-col items-center gap-2 py-4 hover:border-primary hover:shadow-md transition-all text-center group"
            >
              <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-primary mb-2">
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
              <span className="text-xs font-medium text-dark group-hover:text-primary">
                {s.name}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Featured Doctors */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-dark">Top Doctors</h2>
            <p className="text-sm text-muted mt-1">
              {!doctors || doctors.length === 0
                ? "No doctors registered yet"
                : `${doctors.length} verified doctors available`}
            </p>
          </div>
          <button
            onClick={() => navigate("/doctors")}
            className="text-primary text-sm font-medium hover:underline"
          >
            View All →
          </button>
        </div>

        {!doctors || doctors.length === 0 ? (

          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
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
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
            <p className="font-medium text-dark">No doctors available yet</p>
            <p className="text-sm text-muted mt-1">
              Doctors will appear here once added by admin
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {doctors?.slice(0, 8).map((doc) => (
              <div
                key={doc._id}
                onClick={() => navigate(`/appointment/${doc._id}`)}
                className="card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <img
                  src={doc.image}
                  alt={doc.name}
                  className="w-full h-40 object-cover rounded-lg bg-surface mb-3"
                />
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className={`w-2 h-2 rounded-full ${doc.available ? "bg-green-400" : "bg-gray-300"}`}
                  ></span>
                  <span className="text-xs text-muted">
                    {doc.available ? "Available" : "Busy"}
                  </span>
                </div>
                <h3 className="font-semibold text-dark text-sm">{doc.name}</h3>
                <p className="text-xs text-muted mt-0.5">{doc.speciality}</p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-xs text-muted">{doc.experience}</span>
                  <span className="text-xs font-semibold text-primary">
                    ₹{doc.fees}
                  </span>
                </div>
                {doc.avgRating > 0 && (
                  <div className="flex items-center gap-1 mt-2">
                    <svg
                      className="w-3 h-3 text-yellow-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="text-xs text-muted">
                      {doc.avgRating} ({doc.totalReviews})
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* How it works */}
      <section className="bg-surface rounded-2xl p-8">
        <h2 className="text-xl font-bold text-dark mb-8 text-center">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: "1",
              title: "Create Account",
              desc: "Sign up in just 30 seconds",
            },
            {
              step: "2",
              title: "Find Doctor",
              desc: "Search by speciality or name",
            },
            {
              step: "3",
              title: "Book Slot",
              desc: "Pick a convenient time slot",
            },
            {
              step: "4",
              title: "Get Treatment",
              desc: "Visit and receive prescription",
            },
          ].map((item) => (
            <div key={item.step} className="text-center space-y-2">
              <div className="w-12 h-12 bg-primary/10 text-primary font-bold rounded-xl flex items-center justify-center mx-auto text-xl">
                {item.step}
              </div>
              <span className="text-xs font-bold text-primary">
                STEP {item.step}
              </span>
              <h3 className="font-semibold text-dark text-sm">{item.title}</h3>
              <p className="text-xs text-muted">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default Home;
