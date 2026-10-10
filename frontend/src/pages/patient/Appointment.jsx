import { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { bookAppointment } from "../../services/appointment.service.js";
import { getDoctorSlots } from "../../services/doctor.service.js";
import { toast } from "react-toastify";
import { AppContext } from "../../context/AppContext";
import { Building2, Video, Phone } from "lucide-react";
import { APPOINTMENT_TYPES } from "../../constants";

const daysOfWeek = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

const formatDateToYMD = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const Appointment = () => {
  const { docId } = useParams();
  const navigate = useNavigate();
  const { doctors, token, getDoctors } = useContext(AppContext);

  const [doctor, setDoctor] = useState(null);
  const [dayList, setDayList] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedTime, setSelectedTime] = useState("");
  const [reason, setReason] = useState("");
  const [type, setType] = useState("in-person");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    const doc = doctors.find((d) => (d.id || d._id) === docId);
    if (doc) setDoctor(doc);
  }, [doctors, docId]);

  // Build the 7-day calendar window
  useEffect(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push(d);
    }
    setDayList(days);
  }, []);

  // Fetch real-time available slots for the selected day from backend API
  useEffect(() => {
    if (!docId || !dayList[selectedDay]) return;

    const targetDate = dayList[selectedDay];
    const dateStr = formatDateToYMD(targetDate);
    setSlotsLoading(true);

    getDoctorSlots(docId, dateStr)
      .then((res) => {
        const slotData = res.data?.data;
        if (slotData && Array.isArray(slotData.slots)) {
          const validSlots = slotData.slots
            .filter((s) => s.available)
            .map((s) => s.startTime);
          setAvailableSlots(validSlots);
        } else {
          setAvailableSlots([]);
        }
      })
      .catch((err) => {
        console.error("Failed to load doctor slots:", err);
        setAvailableSlots([]);
      })
      .finally(() => {
        setSlotsLoading(false);
      });
  }, [docId, selectedDay, dayList]);

  const handleBook = async () => {
    if (!token) {
      toast.warn("Please login to book");
      navigate("/login");
      return;
    }
    if (!selectedTime) {
      toast.warn("Please select a time slot");
      return;
    }
    if ((type === "video" || type === "phone") && !phone.trim()) {
      toast.warn("Please enter your phone number for this appointment type");
      return;
    }

    setLoading(true);
    try {
      const targetDate = dayList[selectedDay];
      const appointmentDate = formatDateToYMD(targetDate);
      const { data } = await bookAppointment({
        doctorId: docId,
        docId,
        appointmentDate,
        slotDate: appointmentDate,
        startTime: selectedTime,
        slotTime: selectedTime,
        appointmentType: type,
        type,
        reason,
        phone,
      });

      if (data.success) {
        toast.success("Appointment booked!");
        if (getDoctors) getDoctors();
        navigate("/my-appointments");
      } else {
        toast.error(data.message);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!doctor)
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <p className="text-muted">Loading doctor details...</p>
      </div>
    );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Doctor Card */}
      <div className="card flex flex-col sm:flex-row gap-6 mb-6">
        <img
          src={doctor.image}
          alt={doctor.name}
          className="w-36 h-36 object-cover rounded-xl bg-surface"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-lg font-bold text-dark">{doctor.name}</h1>
            {doctor.isVerified && (
              <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                Verified
              </span>
            )}
          </div>
          <p className="text-sm text-muted">
            {doctor.degree} · {doctor.speciality}
          </p>
          <p className="text-xs text-muted mt-1">
            {doctor.experience} experience
          </p>
          <p className="text-sm text-dark mt-3 leading-relaxed">
            {doctor.about}
          </p>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-lg font-bold text-primary">
              ₹{doctor.fees}
            </span>
            {doctor.avgRating > 0 && (
              <span className="flex items-center gap-1 text-sm text-muted">
                <svg
                  className="w-4 h-4 text-yellow-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {doctor.avgRating} ({doctor.totalReviews} reviews)
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Slot selector */}
        <div className="card">
          <h2 className="font-semibold text-dark mb-4">
            Select Date &amp; Time
          </h2>

          {/* Day tabs */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
            {dayList.map((d, i) => (
              <button
                key={i}
                onClick={() => {
                  setSelectedDay(i);
                  setSelectedTime("");
                }}
                className={`shrink-0 flex flex-col items-center px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedDay === i
                    ? "bg-primary text-white"
                    : "bg-surface text-muted hover:bg-gray-200"
                }`}
              >
                <span>{daysOfWeek[d.getDay()]}</span>
                <span className="text-base font-bold">{d.getDate()}</span>
              </button>
            ))}
          </div>

          {/* Time slots */}
          <div className="flex flex-wrap gap-2">
            {slotsLoading ? (
              <p className="text-sm text-muted">Checking doctor schedule...</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-muted">No slots available for this date</p>
            ) : (
              availableSlots.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTime(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    selectedTime === t
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 text-muted hover:border-primary hover:text-primary"
                  }`}
                >
                  {t}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Booking details */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-dark">Appointment Details</h2>

          <div>
            <label className="text-xs font-medium text-dark block mb-1">
              Appointment Type
            </label>
            <div className="flex gap-2">
              {APPOINTMENT_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    setType(t);
                    setPhone("");
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                    type === t
                      ? "bg-primary text-white border-primary"
                      : "border-gray-200 text-muted hover:border-primary"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {t === "in-person"
                      ? <><Building2 size={16} /> In-Person</>
                      : t === "video"
                        ? <><Video size={16} /> Video</>
                        : <><Phone size={16} /> Phone</>}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Phone number — only for video/phone appointments */}
          {(type === "video" || type === "phone") && (
            <div>
              <label className="text-xs font-medium text-dark block mb-1">
                Phone Number <span className="text-red-500">*</span>
                <span className="text-muted font-normal ml-1">
                  (Doctor will contact you on this number)
                </span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 9876543210"
                className="input-field"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-dark block mb-1">
              Reason for Visit
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Briefly describe your symptoms or reason..."
              rows={3}
              className="input-field resize-none"
            />
          </div>

          <div className="bg-surface rounded-lg p-3 space-y-1.5 text-xs">
            <div className="flex justify-between text-muted">
              <span>Consultation Fee</span>
              <span className="font-medium text-dark">₹{doctor.fees}</span>
            </div>
            {selectedTime && (
              <div className="flex justify-between text-muted">
                <span>Selected Slot</span>
                <span className="font-medium text-dark">{selectedTime}</span>
              </div>
            )}
            <div className="flex justify-between text-muted">
              <span>Type</span>
              <span className="font-medium text-dark capitalize">{type}</span>
            </div>
          </div>

          <button
            onClick={handleBook}
            disabled={loading || !selectedTime}
            className="btn-primary w-full py-3 disabled:opacity-50"
          >
            {loading ? "Booking..." : "Confirm Appointment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Appointment;
