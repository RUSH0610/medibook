import { useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import { Star, X, Video, Building2, Phone } from "lucide-react";
import { listAppointments, cancelAppointment as cancelApptService } from "../services/user.service.js";

const StarRating = ({ value, onChange }) => (
  <div className="flex gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        onClick={() => onChange(star)}
        className={`text-2xl transition-transform hover:scale-110 ${
          star <= value ? "text-yellow-400" : "text-gray-300"
        }`}
      >
        <Star size={24} className={star <= value ? "fill-yellow-400" : ""} />
      </button>
    ))}
  </div>
);

const ReviewModal = ({
  appointment,
  onClose,
  onSubmitted,
  token,
}) => {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.warn("Please select a star rating");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/reviews/submit`,
        {
          doctorId: appointment.docId,
          appointmentId: appointment._id,
          rating,
          comment,
          isAnonymous,
        },
        { headers: { token } },
      );
      if (data.success) {
        toast.success("Review submitted! Thank you.");
        onSubmitted();
        onClose();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-dark text-lg">Rate Your Appointment</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-dark text-xl leading-none"
          >
            <X size={20} />
          </button>
        </div>

        {/* Doctor info */}
        <div className="flex items-center gap-3 mb-5 p-3 bg-surface rounded-xl">
          <img
            src={appointment.docData?.image}
            alt={appointment.docData?.name}
            className="w-12 h-12 rounded-xl object-cover"
          />
          <div>
            <p className="font-semibold text-dark text-sm">
              {appointment.docData?.name}
            </p>
            <p className="text-xs text-muted">
              {appointment.docData?.speciality}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {/* Star rating */}
          <div>
            <label className="text-xs font-medium text-dark block mb-2">
              Your Rating *
            </label>
            <StarRating value={rating} onChange={setRating} />
            {rating > 0 && (
              <p className="text-xs text-muted mt-1">
                {["", "Poor", "Fair", "Good", "Very Good", "Excellent"][rating]}
              </p>
            )}
          </div>

          {/* Comment */}
          <div>
            <label className="text-xs font-medium text-dark block mb-1">
              Your Experience{" "}
              <span className="text-muted font-normal">(optional)</span>
            </label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this doctor..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          {/* Anonymous toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setIsAnonymous(!isAnonymous)}
              className={`w-9 h-5 rounded-full transition-colors relative ${
                isAnonymous ? "bg-primary" : "bg-gray-200"
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                  isAnonymous ? "left-4" : "left-0.5"
                }`}
              />
            </div>
            <span className="text-xs text-dark">Post anonymously</span>
          </label>
        </div>

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-outline flex-1 text-sm">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="btn-primary flex-1 text-sm disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
};

const MyAppointments = () => {
  const { token } = useContext(AppContext);
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewTarget, setReviewTarget] = useState(null);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    fetchAppointments();
  }, [token]);

  const fetchAppointments = async () => {
    try {
      const { data } = await listAppointments(token);
      if (data.success) setAppointments(data.appointments.reverse());
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const cancelAppointment = async (id) => {
    try {
      const { data } = await cancelApptService({ appointmentId: id }, token);
      if (data.success) {
        toast.success("Appointment cancelled");
        fetchAppointments();
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const typeIcon = (type) => {
    if (type === "video") return <Video size={14} />;
    if (type === "phone") return <Phone size={14} />;
    return <Building2 size={14} />;
  };

  if (loading)
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <p className="text-muted">Loading appointments...</p>
      </div>
    );

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold text-dark mb-6">My Appointments</h1>

      {appointments.length === 0 ? (
        <div className="card text-center py-14">
          <p className="font-medium text-dark">No appointments yet</p>
          <p className="text-sm text-muted mt-1">
            Book an appointment with a doctor to get started
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {appointments.map((a) => (
            <div
              key={a._id}
              className="card flex flex-col sm:flex-row items-start gap-4"
            >
              <img
                src={a.docData?.image}
                alt={a.docData?.name}
                className="w-16 h-16 rounded-xl object-cover bg-surface shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-dark">
                  {a.docData?.name}
                </h3>
                <p className="text-xs text-muted">{a.docData?.speciality}</p>
                <p className="text-xs text-muted mt-1">
                  {a.slotDate?.replace(/_/g, "/")} · {a.slotTime}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="flex items-center gap-1 text-xs text-muted capitalize">
                    {typeIcon(a.type)} {a.type || "in-person"}
                  </span>
                  <span
                    className={`badge ${
                      a.cancelled
                        ? "bg-red-100 text-red-600"
                        : a.isCompleted
                          ? "bg-green-100 text-green-700"
                          : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {a.cancelled
                      ? "Cancelled"
                      : a.isCompleted
                        ? "Completed"
                        : "Pending"}
                  </span>
                  {a.isCompleted && a.hasReview && (
                    <div className="flex items-center gap-1">
                      <span className="flex gap-0.5 text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={12} className="fill-yellow-400" />
                        ))}
                      </span>
                      <span className="text-xs text-muted">Reviewed</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex sm:flex-col gap-2 shrink-0">
                {!a.cancelled && !a.isCompleted && (
                  <button
                    onClick={() => cancelAppointment(a._id)}
                    className="text-xs border border-red-200 text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    Cancel
                  </button>
                )}
                {a.isCompleted && !a.hasReview && (
                  <button
                    onClick={() => setReviewTarget(a)}
                    className="text-xs border border-primary text-primary px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    Leave Review
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {reviewTarget && (
        <ReviewModal
          appointment={reviewTarget}
          onClose={() => setReviewTarget(null)}
          onSubmitted={fetchAppointments}
          token={token}
        />
      )}
    </div>
  );
};

export default MyAppointments;
