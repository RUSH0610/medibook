import { useContext, useEffect, useState } from "react";
const backendUrl = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import AdminSidebar from "../../components/AdminSidebar";

const AdminReviews = () => {
  const { aToken } = useContext(AppContext);
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    if (!aToken) {
      navigate("/login");
      return;
    }
    fetchReviews();
  }, [aToken]);

  const fetchReviews = async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/api/v1/reviews/all`, {

        headers: { atoken: aToken },
      });
      if (data.success) setReviews(data.reviews);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const toggleApproval = async (id) => {
    try {
      const { data } = await axios.post(
        `${backendUrl}/api/v1/reviews/toggle-approval`,

        { reviewId: id },
        { headers: { atoken: aToken } },
      );
      if (data.success) {
        toast.success(data.message);
        fetchReviews();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="flex min-h-screen bg-surface">
      <AdminSidebar />
      <main className="flex-1 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-dark">Reviews</h1>
          <p className="text-sm text-muted mt-1">
            {reviews.length} total reviews
          </p>
        </div>

        {reviews.length === 0 ? (
          <div className="card text-center py-12">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg
                className="w-8 h-8 text-yellow-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <p className="text-muted">No reviews yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reviews.map((r) => (
              <div key={r._id} className="card flex items-start gap-4">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-sm font-bold text-primary shrink-0">
                  {r.isAnonymous ? "?" : r.userName?.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-dark text-sm">
                      {r.isAnonymous ? "Anonymous" : r.userName}
                    </span>
                    <div className="flex gap-1">
                      {[...Array(5)].map((_, i) => (
                        <svg
                          key={i}
                          className={`w-4 h-4 ${i < r.rating ? "text-yellow-400" : "text-gray-300"}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                    </div>
                    <span
                      className={`badge ${r.isApproved ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}
                    >
                      {r.isApproved ? "Approved" : "Hidden"}
                    </span>
                  </div>
                  {r.comment && (
                    <p className="text-sm text-muted mt-1">{r.comment}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => toggleApproval(r._id)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-colors shrink-0 ${
                    r.isApproved
                      ? "border-red-200 text-red-500 hover:bg-red-50"
                      : "border-green-200 text-green-600 hover:bg-green-50"
                  }`}
                >
                  {r.isApproved ? "Hide" : "Approve"}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminReviews;
