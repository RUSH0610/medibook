import { db, schema } from "../../db/index.js";
import { eq, and, desc, sql } from "drizzle-orm";
import ApiError from "../../utils/ApiError.js";

// Centralized Notification Service
// Dispatches and stores in-app notifications in PostgreSQL
export const createNotification = async ({
  userId,
  type,
  title,
  message,
  relatedId = null,
  link = "",
}) => {
  try {
    if (!userId) return null;

    const res = await db
      .insert(schema.notifications)
      .values({
        userId,
        type,
        title,
        message,
        relatedId,
        link,
      })
      .returning();

    return res[0] || null;
  } catch (error) {
    console.error("[NotificationService] Failed to create notification:", error.message);
    return null;
  }
};

// Event-specific notification helpers
export const notifyAppointmentBooked = async (appointment, patientUser, doctorUser) => {
  await createNotification({
    userId: patientUser.id,
    type: "appointment_booked",
    title: "Appointment Confirmed",
    message: `Your appointment with Dr. ${doctorUser.name} on ${appointment.appointmentDate || appointment.appointment_date} at ${appointment.startTime || appointment.start_time} is confirmed.`,
    relatedId: appointment.id,
    link: "/my-appointments",
  });

  await createNotification({
    userId: doctorUser.id,
    type: "appointment_booked",
    title: "New Appointment Booked",
    message: `Patient ${patientUser.name} booked a consultation for ${appointment.appointmentDate || appointment.appointment_date} at ${appointment.startTime || appointment.start_time}.`,
    relatedId: appointment.id,
    link: "/doctor/appointments",
  });
};

export const notifyAppointmentRescheduled = async (appointment, patientUser, doctorUser) => {
  await createNotification({
    userId: patientUser.id,
    type: "appointment_rescheduled",
    title: "Appointment Rescheduled",
    message: `Your appointment with Dr. ${doctorUser.name} has been rescheduled to ${appointment.appointmentDate || appointment.appointment_date} at ${appointment.startTime || appointment.start_time}.`,
    relatedId: appointment.id,
    link: "/my-appointments",
  });

  await createNotification({
    userId: doctorUser.id,
    type: "appointment_rescheduled",
    title: "Appointment Rescheduled",
    message: `Patient ${patientUser.name} rescheduled their visit to ${appointment.appointmentDate || appointment.appointment_date} at ${appointment.startTime || appointment.start_time}.`,
    relatedId: appointment.id,
    link: "/doctor/appointments",
  });
};

export const notifyAppointmentCancelled = async (appointment, patientUser, doctorUser, cancelledByRole) => {
  const isDoctor = cancelledByRole === "DOCTOR";
  const targetUser = isDoctor ? patientUser : doctorUser;
  const initiatorName = isDoctor ? `Dr. ${doctorUser.name}` : patientUser.name;

  await createNotification({
    userId: targetUser.id,
    type: "appointment_cancelled",
    title: "Appointment Cancelled",
    message: `The appointment scheduled for ${appointment.appointmentDate || appointment.appointment_date} at ${appointment.startTime || appointment.start_time} was cancelled by ${initiatorName}.`,
    relatedId: appointment.id,
    link: isDoctor ? "/my-appointments" : "/doctor/appointments",
  });
};

export const notifyAppointmentCompleted = async (appointment, patientUser, doctorUser) => {
  await createNotification({
    userId: patientUser.id,
    type: "appointment_completed",
    title: "Consultation Completed",
    message: `Your appointment with Dr. ${doctorUser.name} is complete. Please take a moment to leave a review!`,
    relatedId: appointment.id,
    link: "/my-appointments",
  });
};

export const notifyPrescriptionCreated = async (prescriptionId, patientUserId, doctorName) => {
  await createNotification({
    userId: patientUserId,
    type: "prescription_created",
    title: "New Prescription Issued",
    message: `Dr. ${doctorName} has issued a digital prescription for your consultation.`,
    relatedId: prescriptionId,
    link: "/my-prescriptions",
  });
};

export const notifyMedicalRecordUploaded = async (recordId, patientUserId, recordTitle) => {
  await createNotification({
    userId: patientUserId,
    type: "medical_record_uploaded",
    title: "Medical Document Saved",
    message: `Your document "${recordTitle}" has been securely uploaded to your medical vault.`,
    relatedId: recordId,
    link: "/my-records",
  });
};

export const notifyDoctorApproval = async (doctorUserId, isApproved) => {
  await createNotification({
    userId: doctorUserId,
    type: "doctor_approval_status",
    title: isApproved ? "Account Approved" : "Account Suspended",
    message: isApproved
      ? "Congratulations! Your MediBook medical profile has been verified and is now accepting appointments."
      : "Your profile has been temporarily suspended by system administration. Please contact support.",
    link: "/doctor/dashboard",
  });
};

export const notifyAccountStatus = async (userId, isActive) => {
  await createNotification({
    userId,
    type: "account_status_change",
    title: isActive ? "Account Activated" : "Account Suspended",
    message: isActive
      ? "Your MediBook account is fully active."
      : "Your MediBook account has been disabled. Contact support for assistance.",
  });
};

// Query & Mutation Service Functions (Moved from Controller)
export const getNotifications = async ({ userId }) => {
  const notifs = await db
    .select({
      id: schema.notifications.id,
      recipientId: schema.notifications.userId,
      type: schema.notifications.type,
      title: schema.notifications.title,
      message: schema.notifications.message,
      isRead: schema.notifications.isRead,
      relatedId: schema.notifications.relatedId,
      link: schema.notifications.link,
      created_at: schema.notifications.createdAt,
    })
    .from(schema.notifications)
    .where(eq(schema.notifications.userId, userId))
    .orderBy(desc(schema.notifications.createdAt))
    .limit(50);

  return { notifications: notifs };
};

export const markAsRead = async ({ userId, notificationId }) => {
  if (!notificationId) {
    throw new ApiError(400, "Notification ID is required", [], "MISSING_ID");
  }

  const result = await db
    .update(schema.notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(schema.notifications.id, notificationId),
        eq(schema.notifications.userId, userId)
      )
    )
    .returning({ id: schema.notifications.id });

  if (!result.length) {
    throw new ApiError(404, "Notification not found or unauthorized", [], "NOT_FOUND");
  }
};

export const markAllRead = async ({ userId }) => {
  await db
    .update(schema.notifications)
    .set({ isRead: true })
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isRead, false)
      )
    );
};

export const getUnreadCount = async ({ userId }) => {
  const countRes = await db
    .select({ count: sql`COUNT(*)::int` })
    .from(schema.notifications)
    .where(
      and(
        eq(schema.notifications.userId, userId),
        eq(schema.notifications.isRead, false)
      )
    );

  const count = countRes[0]?.count || 0;
  return { count };
};

export default {
  createNotification,
  notifyAppointmentBooked,
  notifyAppointmentRescheduled,
  notifyAppointmentCancelled,
  notifyAppointmentCompleted,
  notifyPrescriptionCreated,
  notifyMedicalRecordUploaded,
  notifyDoctorApproval,
  notifyAccountStatus,
  getNotifications,
  markAsRead,
  markAllRead,
  getUnreadCount,
};
