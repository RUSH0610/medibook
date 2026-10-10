import { db, schema } from "../../db/index.js";
import { eq, and, ne, notInArray, desc, sql } from "drizzle-orm";
import ApiError from "../../utils/ApiError.js";
import {
  notifyAppointmentBooked,
  notifyAppointmentRescheduled,
  notifyAppointmentCancelled,
  notifyAppointmentCompleted,
} from "../notifications/notification.service.js";

const DAYS_OF_WEEK = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

// Format Date object to YYYY-MM-DD
export const formatDateStr = (dateObj) => {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// Add minutes to "HH:mm" time string
export const addMinutesToTime = (timeStr, minutes) => {
  const [h, m] = timeStr.split(":").map(Number);
  const totalMins = h * 60 + m + minutes;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
};

// Normalize time string to 24-hour "HH:mm"
export const normalizeTimeTo24h = (timeStr) => {
  if (!timeStr) return "00:00";
  let clean = String(timeStr).trim().toUpperCase();
  const isPM = clean.includes("PM");
  const isAM = clean.includes("AM");
  clean = clean.replace(/AM|PM/gi, "").trim();
  let [hours, minutes] = clean.split(":").map(Number);
  if (isNaN(hours)) hours = 0;
  if (isNaN(minutes)) minutes = 0;

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
};

// Dynamic appointment slot generation for a doctor on a specific date
export const getDoctorSlotsForDate = async (doctorId, dateStr) => {
  const targetDate = new Date(`${dateStr}T00:00:00`);
  if (isNaN(targetDate.getTime())) {
    throw new ApiError(400, "Invalid date format. Expected YYYY-MM-DD", [], "INVALID_DATE");
  }

  const dayName = DAYS_OF_WEEK[targetDate.getDay()];

  const availRes = await db
    .select({
      start_time: schema.doctorAvailability.startTime,
      end_time: schema.doctorAvailability.endTime,
      slot_duration_minutes: schema.doctorAvailability.slotDurationMinutes,
      is_active: schema.doctorAvailability.isActive,
    })
    .from(schema.doctorAvailability)
    .where(
      and(
        eq(schema.doctorAvailability.doctorId, doctorId),
        eq(schema.doctorAvailability.dayOfWeek, dayName),
        eq(schema.doctorAvailability.isActive, true)
      )
    );

  let start_time = "09:00:00";
  let end_time = "17:00:00";
  let slot_duration_minutes = 30;

  if (availRes.length) {
    start_time = availRes[0].start_time;
    end_time = availRes[0].end_time;
    slot_duration_minutes = availRes[0].slot_duration_minutes;
  }

  const leaveRes = await db
    .select({
      is_full_day: schema.doctorLeaveBlocks.isFullDay,
      start_time: schema.doctorLeaveBlocks.startTime,
      end_time: schema.doctorLeaveBlocks.endTime,
      reason: schema.doctorLeaveBlocks.reason,
    })
    .from(schema.doctorLeaveBlocks)
    .where(
      and(
        eq(schema.doctorLeaveBlocks.doctorId, doctorId),
        eq(schema.doctorLeaveBlocks.leaveDate, dateStr)
      )
    );

  const fullDayLeave = leaveRes.find((l) => l.is_full_day);
  if (fullDayLeave) {
    return {
      date: dateStr,
      dayOfWeek: dayName,
      isAvailableDay: false,
      leaveReason: fullDayLeave.reason || "Doctor on leave",
      slots: [],
    };
  }

  const apptRes = await db
    .select({
      start_time: schema.appointments.startTime,
      end_time: schema.appointments.endTime,
    })
    .from(schema.appointments)
    .where(
      and(
        eq(schema.appointments.doctorId, doctorId),
        eq(schema.appointments.appointmentDate, dateStr),
        ne(schema.appointments.status, "CANCELLED")
      )
    );

  const bookedSlots = new Set(
    apptRes.map((r) => r.start_time.substring(0, 5))
  );

  const slots = [];
  const startHM = start_time.substring(0, 5);
  const endHM = end_time.substring(0, 5);

  const now = new Date();
  const todayStr = formatDateStr(now);
  const isToday = dateStr === todayStr;
  const currentHM = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  let cursor = startHM;
  while (cursor < endHM) {
    const slotEnd = addMinutesToTime(cursor, slot_duration_minutes);
    if (slotEnd > endHM) break;

    const isPast = isToday && cursor <= currentHM;
    const isBooked = bookedSlots.has(cursor);
    const isPartialLeave = leaveRes.some((l) => {
      if (l.is_full_day) return true;
      if (!l.start_time || !l.end_time) return false;
      const lStart = l.start_time.substring(0, 5);
      const lEnd = l.end_time.substring(0, 5);
      return cursor >= lStart && cursor < lEnd;
    });

    const isAvailable = !isPast && !isBooked && !isPartialLeave;

    slots.push({
      startTime: cursor,
      endTime: slotEnd,
      available: isAvailable,
    });

    cursor = slotEnd;
  }

  return {
    date: dateStr,
    dayOfWeek: dayName,
    isAvailableDay: true,
    slots,
  };
};

// Concurrency-Safe Appointment Booking
export const bookAppointmentSafe = async ({
  patientUserId,
  doctorId,
  appointmentDate,
  startTime,
  appointmentType = "in-person",
  reason = "",
  notes = "",
  phone = "",
}) => {
  const patientRes = await db
    .select({
      id: schema.patients.id,
      user_id: schema.patients.userId,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
    })
    .from(schema.patients)
    .innerJoin(schema.users, eq(schema.users.id, schema.patients.userId))
    .where(eq(schema.patients.userId, patientUserId));

  if (!patientRes.length) {
    throw new ApiError(400, "Patient profile not found. Please complete profile.", [], "PATIENT_NOT_FOUND");
  }
  const patient = patientRes[0];

  const targetDate = new Date(`${appointmentDate}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(targetDate.getTime()) || targetDate < today) {
    throw new ApiError(400, "Appointment date cannot be in the past", [], "INVALID_APPOINTMENT_DATE");
  }

  const targetTime24 = normalizeTimeTo24h(startTime);
  const slotData = await getDoctorSlotsForDate(doctorId, appointmentDate);
  const matchingSlot = slotData.slots.find((s) => s.startTime === targetTime24);

  if (!matchingSlot) {
    throw new ApiError(400, "The requested time slot is not part of the doctor's schedule", [], "DOCTOR_NOT_AVAILABLE");
  }

  if (!matchingSlot.available) {
    throw new ApiError(409, "This appointment slot is no longer available", [], "SLOT_UNAVAILABLE");
  }

  const endTime = matchingSlot.endTime;
  startTime = targetTime24;

  try {
    const newAppointment = await db.transaction(async (tx) => {
      const docRes = await tx.execute(
        sql`SELECT d.id, d.user_id, d.consultation_fee, d.is_approved, d.is_available, u.name, u.email 
            FROM doctors d
            JOIN users u ON u.id = d.user_id
            WHERE d.id = ${doctorId} FOR UPDATE`
      );

      const doctorRows = docRes.rows || docRes;
      if (!doctorRows.length) {
        throw new ApiError(404, "Doctor not found", [], "DOCTOR_NOT_FOUND");
      }
      const doctor = doctorRows[0];

      if (!doctor.is_available || !doctor.is_approved) {
        throw new ApiError(400, "Doctor is currently unavailable for bookings", [], "DOCTOR_NOT_AVAILABLE");
      }

      const checkExisting = await tx
        .select({ id: schema.appointments.id })
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.doctorId, doctorId),
            eq(schema.appointments.appointmentDate, appointmentDate),
            eq(schema.appointments.startTime, startTime),
            ne(schema.appointments.status, "CANCELLED")
          )
        );

      if (checkExisting.length > 0) {
        throw new ApiError(409, "This appointment slot is no longer available", [], "SLOT_UNAVAILABLE");
      }

      const contactPhone = phone || patient.phone || "";
      const fee = doctor.consultation_fee || "0.00";

      const apptRes = await tx
        .insert(schema.appointments)
        .values({
          patientId: patient.id,
          doctorId,
          appointmentDate,
          startTime,
          endTime,
          appointmentType,
          status: "CONFIRMED",
          reason,
          notes,
          patientPhone: contactPhone,
          amount: String(fee),
        })
        .returning();

      return {
        appointment: apptRes[0],
        doctorUser: { id: doctor.user_id, name: doctor.name, email: doctor.email },
        patientUser: { id: patient.user_id, name: patient.name, email: patient.email },
      };
    });

    await notifyAppointmentBooked(
      newAppointment.appointment,
      newAppointment.patientUser,
      newAppointment.doctorUser
    );

    return newAppointment.appointment;
  } catch (error) {
    if (error.code === "23505" || error.message?.includes("23505")) {
      throw new ApiError(409, "This appointment slot is no longer available", [], "SLOT_UNAVAILABLE");
    }
    throw error;
  }
};

// Get Current Patient's Appointments
export const getPatientAppointments = async ({ patientUserId }) => {
  const apptRes = await db
    .select({
      id: schema.appointments.id,
      docId: schema.appointments.doctorId,
      slotDate: schema.appointments.appointmentDate,
      slotTime: schema.appointments.startTime,
      type: schema.appointments.appointmentType,
      status: schema.appointments.status,
      amount: schema.appointments.amount,
      reason: schema.appointments.reason,
      notes: schema.appointments.notes,
      phone: schema.appointments.patientPhone,
      created_at: schema.appointments.createdAt,
      cancelled: sql`CASE WHEN ${schema.appointments.status} = 'CANCELLED' THEN true ELSE false END`,
      isCompleted: sql`CASE WHEN ${schema.appointments.status} = 'COMPLETED' THEN true ELSE false END`,
      rating: sql`COALESCE(${schema.reviews.rating}, 0)::int`,
      docData: sql`json_build_object(
        'id', ${schema.doctors.id},
        'name', ${sql`du.name`},
        'email', ${sql`du.email`},
        'image', ${sql`du.avatar_url`},
        'speciality', ${schema.specializations.name},
        'degree', ${schema.doctors.qualification},
        'fees', ${schema.doctors.consultationFee},
        'address', ${schema.doctors.address}
      )`,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .leftJoin(schema.reviews, eq(schema.reviews.appointmentId, schema.appointments.id))
    .where(eq(schema.patients.userId, patientUserId))
    .orderBy(desc(schema.appointments.appointmentDate), desc(schema.appointments.startTime));

  return { appointments: apptRes };
};

// Get Doctor Appointments (Doctor Panel)
export const getDoctorAppointments = async ({ doctorId }) => {
  const apptRes = await db
    .select({
      id: schema.appointments.id,
      patientId: schema.appointments.patientId,
      slotDate: schema.appointments.appointmentDate,
      slotTime: schema.appointments.startTime,
      type: schema.appointments.appointmentType,
      status: schema.appointments.status,
      amount: schema.appointments.amount,
      reason: schema.appointments.reason,
      notes: schema.appointments.notes,
      phone: schema.appointments.patientPhone,
      created_at: schema.appointments.createdAt,
      cancelled: sql`CASE WHEN ${schema.appointments.status} = 'CANCELLED' THEN true ELSE false END`,
      isCompleted: sql`CASE WHEN ${schema.appointments.status} = 'COMPLETED' THEN true ELSE false END`,
      rating: sql`COALESCE(${schema.reviews.rating}, 0)::int`,
      userData: sql`json_build_object(
        'id', ${sql`pu.id`},
        'name', ${sql`pu.name`},
        'email', ${sql`pu.email`},
        'image', ${sql`pu.avatar_url`},
        'phone', ${schema.appointments.patientPhone},
        'dob', ${schema.patients.dateOfBirth},
        'bloodGroup', ${schema.patients.bloodGroup},
        'gender', ${schema.patients.gender}
      )`,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .leftJoin(schema.reviews, eq(schema.reviews.appointmentId, schema.appointments.id))
    .where(eq(schema.appointments.doctorId, doctorId))
    .orderBy(desc(schema.appointments.appointmentDate), desc(schema.appointments.startTime));

  return { appointments: apptRes };
};

// Concurrency-Safe Appointment Rescheduling
export const rescheduleAppointmentSafe = async ({
  appointmentId,
  patientUserId,
  newDate,
  newStartTime,
}) => {
  const apptRes = await db
    .select({
      id: schema.appointments.id,
      doctorId: schema.appointments.doctorId,
      status: schema.appointments.status,
      patient_user_id: schema.patients.userId,
      doctor_user_id: schema.doctors.userId,
      doctor_name: sql`du.name`,
      patient_name: sql`pu.name`,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .where(eq(schema.appointments.id, appointmentId));

  if (!apptRes.length) {
    throw new ApiError(404, "Appointment not found", [], "APPOINTMENT_NOT_FOUND");
  }

  const appt = apptRes[0];

  if (appt.patient_user_id !== patientUserId) {
    throw new ApiError(403, "You are not authorized to reschedule this appointment", [], "FORBIDDEN");
  }

  if (appt.status === "COMPLETED" || appt.status === "CANCELLED") {
    throw new ApiError(400, `Cannot reschedule an appointment that is already ${appt.status.toLowerCase()}`, [], "INVALID_STATUS");
  }

  const targetDay = new Date(`${newDate}T00:00:00`);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  if (isNaN(targetDay.getTime()) || targetDay < todayStart) {
    throw new ApiError(400, "Appointment date cannot be in the past", [], "INVALID_APPOINTMENT_DATE");
  }

  newStartTime = normalizeTimeTo24h(newStartTime);
  const slotData = await getDoctorSlotsForDate(appt.doctorId, newDate);
  const matchingSlot = slotData.slots.find((s) => s.startTime === newStartTime);

  if (!matchingSlot || !matchingSlot.available) {
    throw new ApiError(409, "The requested new slot is not available", [], "SLOT_UNAVAILABLE");
  }

  const newEndTime = matchingSlot.endTime;

  try {
    const updated = await db.transaction(async (tx) => {
      const checkCollision = await tx
        .select({ id: schema.appointments.id })
        .from(schema.appointments)
        .where(
          and(
            eq(schema.appointments.doctorId, appt.doctorId),
            eq(schema.appointments.appointmentDate, newDate),
            eq(schema.appointments.startTime, newStartTime),
            ne(schema.appointments.status, "CANCELLED"),
            ne(schema.appointments.id, appointmentId)
          )
        );

      if (checkCollision.length > 0) {
        throw new ApiError(409, "The requested new slot is no longer available", [], "SLOT_UNAVAILABLE");
      }

      const updateRes = await tx
        .update(schema.appointments)
        .set({
          appointmentDate: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          updatedAt: sql`NOW()`,
        })
        .where(eq(schema.appointments.id, appointmentId))
        .returning();

      return updateRes[0];
    });

    await notifyAppointmentRescheduled(
      updated,
      { id: appt.patient_user_id, name: appt.patient_name },
      { id: appt.doctor_user_id, name: appt.doctor_name }
    );

    return updated;
  } catch (err) {
    if (err.code === "23505" || err.message?.includes("23505")) {
      throw new ApiError(409, "The requested new slot is no longer available", [], "SLOT_UNAVAILABLE");
    }
    throw err;
  }
};

// Safe Appointment Cancellation
export const cancelAppointmentSafe = async ({ appointmentId, user }) => {
  const apptRes = await db
    .select({
      id: schema.appointments.id,
      doctorId: schema.appointments.doctorId,
      status: schema.appointments.status,
      patient_user_id: schema.patients.userId,
      doctor_user_id: schema.doctors.userId,
      doctor_name: sql`du.name`,
      patient_name: sql`pu.name`,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .where(eq(schema.appointments.id, appointmentId));

  if (!apptRes.length) {
    throw new ApiError(404, "Appointment not found", [], "APPOINTMENT_NOT_FOUND");
  }

  const appt = apptRes[0];

  const isPatientOwner = user.role === "PATIENT" && appt.patient_user_id === user.id;
  const isDoctorOwner = user.role === "DOCTOR" && appt.doctor_user_id === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isPatientOwner && !isDoctorOwner && !isAdmin) {
    throw new ApiError(403, "Unauthorized to cancel this appointment", [], "FORBIDDEN");
  }

  if (appt.status === "COMPLETED") {
    throw new ApiError(400, "Completed appointments cannot be cancelled", [], "INVALID_STATUS");
  }

  if (appt.status === "CANCELLED") {
    throw new ApiError(400, "Appointment is already cancelled", [], "ALREADY_CANCELLED");
  }

  const updateRes = await db
    .update(schema.appointments)
    .set({
      status: "CANCELLED",
      updatedAt: sql`NOW()`,
    })
    .where(eq(schema.appointments.id, appointmentId))
    .returning();

  const updated = updateRes[0];

  await notifyAppointmentCancelled(
    updated,
    { id: appt.patient_user_id, name: appt.patient_name },
    { id: appt.doctor_user_id, name: appt.doctor_name },
    user.role
  );

  return updated;
};

// Complete Appointment (Doctor only)
export const completeAppointmentSafe = async ({ appointmentId, doctorId, user }) => {
  if (!appointmentId) {
    throw new ApiError(400, "Appointment ID is required", [], "MISSING_ID");
  }

  const apptRes = await db
    .select({
      id: schema.appointments.id,
      status: schema.appointments.status,
      patient_user_id: sql`pu.id`,
      patient_name: sql`pu.name`,
      doctor_name: sql`du.name`,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
    .where(and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.doctorId, doctorId)));

  if (!apptRes.length) {
    throw new ApiError(404, "Appointment not found or not assigned to you", [], "NOT_FOUND");
  }

  const appt = apptRes[0];

  if (appt.status === "COMPLETED") {
    return { appointment: appt, alreadyCompleted: true };
  }

  if (appt.status === "CANCELLED") {
    throw new ApiError(400, "Cancelled appointments cannot be completed", [], "INVALID_STATUS");
  }

  const updateRes = await db
    .update(schema.appointments)
    .set({
      status: "COMPLETED",
      updatedAt: sql`NOW()`,
    })
    .where(eq(schema.appointments.id, appointmentId))
    .returning();

  await notifyAppointmentCompleted(
    updateRes[0],
    { id: appt.patient_user_id, name: appt.patient_name },
    { id: user.id, name: appt.doctor_name }
  );

  return { appointment: updateRes[0], alreadyCompleted: false };
};

export default {
  getDoctorSlotsForDate,
  bookAppointmentSafe,
  getPatientAppointments,
  getDoctorAppointments,
  rescheduleAppointmentSafe,
  cancelAppointmentSafe,
  completeAppointmentSafe,
};
