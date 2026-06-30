import { useContext, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppContext } from "../context/AppContext";

import { SPECIALITIES } from "../constants/index.js";

const specialities = SPECIALITIES;

const Doctors = () => {
  const navigate = useNavigate();
  const { speciality } = useParams();
  const { doctors, getDoctors } = useContext(AppContext);
  useEffect(() => {
    getDoctors();
  }, []);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(speciality || "");

  useEffect(() => {
    setSelected(speciality || "");
  }, [speciality]);

  const filtered = doctors.filter((d) => {
    const matchSpec = selected ? d.speciality === selected : true;
    const matchSearch = search
      ? d.name.toLowerCase().includes(search.toLowerCase()) ||
        d.speciality.toLowerCase().includes(search.toLowerCase())
      : true;
    return matchSpec && matchSearch;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark">Find a Doctor</h1>
        <p className="text-sm text-muted mt-1">
          {filtered.length} doctors available
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar filters */}
        <aside className="md:w-52 shrink-0">
          <div className="card">
            <h3 className="font-semibold text-dark text-sm mb-3">Speciality</h3>
            <div className="space-y-1">
              <button
                onClick={() => {
                  setSelected("");
                  navigate("/doctors");
                }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  !selected
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-surface"
                }`}
              >
                All Doctors
              </button>
              {specialities.map((s) => (
                <button
                  key={s}
                  onClick={() => {
                    setSelected(s);
                    navigate(`/doctors/${s}`);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    selected === s
                      ? "bg-primary text-white"
                      : "text-muted hover:bg-surface"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1">
          {/* Search */}
          <div className="mb-4">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or speciality..."
              className="input-field"
            />
          </div>

          {filtered.length === 0 ? (
            <div className="card text-center py-12">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
              <p className="text-dark font-medium">No doctors found</p>
              <p className="text-sm text-muted mt-1">
                Try a different filter or search term
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((doc) => (
                <div
                  key={doc._id}
                  onClick={() => navigate(`/appointment/${doc._id}`)}
                  className="card cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all"
                >
                  <img
                    src={doc.image}
                    alt={doc.name}
                    className="w-full h-36 object-cover rounded-lg bg-surface mb-3"
                  />
                  <div className="flex items-center gap-1.5 mb-1">
                    <span
                      className={`w-2 h-2 rounded-full ${doc.available ? "bg-green-400" : "bg-gray-300"}`}
                    ></span>
                    <span className="text-xs text-muted">
                      {doc.available ? "Available" : "Not Available"}
                    </span>
                  </div>
                  <h3 className="font-semibold text-dark text-sm">
                    {doc.name}
                  </h3>
                  <p className="text-xs text-muted">{doc.speciality}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {doc.degree} · {doc.experience}
                  </p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-1">
                      {doc.avgRating > 0 && (
                        <>
                          <svg
                            className="w-3 h-3 text-yellow-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-xs text-muted">
                            {doc.avgRating}
                          </span>
                        </>
                      )}
                    </div>
                    <span className="text-sm font-bold text-primary">
                      ₹{doc.fees}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Doctors;
