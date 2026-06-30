import { useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import { BadgeCheck, Star } from "lucide-react";

const DoctorDetail = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { doctors } = useContext(AppContext);
  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    const doc = doctors.find((d) => d._id === docId);
    if (doc) setDoctor(doc);
    fetchReviews();
  }, [doctors, docId]);

  const fetchReviews = async () => {
    try {
      const { data } = await axios.get(
        `${backendUrl}/api/v1/reviews/doctor/${docId}`,

      );
      if (data.success) setReviews(data.reviews);
    } catch (err) {
      console.error(err.message);
    }
  };

  if (!doctor)
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-muted">
        Loading...
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Doctor Info */}
      <div className="card flex flex-col sm:flex-row gap-6">
        <img
          src={doctor.image}
          alt={doctor.name}
          className="w-40 h-40 object-cover rounded-xl bg-surface"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h1 className="text-xl font-bold text-dark">{doctor.name}</h1>
            {doctor.isVerified && (
              <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                <BadgeCheck size={16} /> Verified
              </span>
            )}
          </div>
          <p className="text-muted text-sm">
            {doctor.degree} · {doctor.speciality}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {doctor.experience} experience
          </p>
          <p className="text-sm text-dark mt-3 leading-relaxed">
            {doctor.about}
          </p>
          <div className="flex items-center gap-6 mt-4">
            <div>
              <p className="text-xs text-muted">Consultation Fee</p>
              <p className="text-xl font-bold text-primary">₹{doctor.fees}</p>
            </div>
            {doctor.avgRating > 0 && (
              <div>
                <p className="text-xs text-muted">Rating</p>
                <p className="font-bold text-dark flex items-center gap-1">
                  <Star size={16} className="text-yellow-400 fill-yellow-400" /> {doctor.avgRating}{" "}
                  <span className="text-xs font-normal text-muted">
                    ({doctor.totalReviews} reviews)
                  </span>
                </p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted">Status</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${doctor.available ? "bg-green-400" : "bg-gray-300"}`}
                ></span>
                <span className="text-sm font-medium">
                  {doctor.available ? "Available" : "Unavailable"}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate(`/appointment/${doctor._id}`)}
            className="btn-primary mt-4"
          >
            Book Appointment
          </button>
        </div>
      </div>

      {/* Reviews */}
      <div className="card">
        <h2 className="font-semibold text-dark mb-4">
          Patient Reviews ({reviews.length})
        </h2>
        {reviews.length === 0 ? (
          <p className="text-sm text-muted">No reviews yet for this doctor.</p>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div
                key={r._id}
                className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
              >
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary">
                    {r.isAnonymous ? "?" : r.userName?.charAt(0)}
                  </div>
                  <span className="text-sm font-medium text-dark">
                    {r.isAnonymous ? "Anonymous" : r.userName}
                  </span>
                  <span className="flex gap-0.5 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        size={14}
                        className={star <= r.rating ? "fill-yellow-400" : "text-gray-300"}
                      />
                    ))}
                  </span>
                </div>
                {r.comment && (
                  <p className="text-sm text-muted ml-9">{r.comment}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DoctorDetail;
