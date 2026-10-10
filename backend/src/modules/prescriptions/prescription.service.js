import { db, schema } from "../../db/index.js";
import { eq, and, desc, sql } from "drizzle-orm";
import ApiError from "../../utils/ApiError.js";
import { notifyPrescriptionCreated } from "../notifications/notification.service.js";

// Doctor Issues a Digital Prescription
export const issuePrescription = async ({
  doctorId,
  appointmentId,
  patientId,
  diagnosis,
  medicines = [],
  labTests = [],
  advice = "",
  followUpDate,
  nextVisitIn = "",
  notes = "",
}) => {
  if (!appointmentId || !diagnosis || !String(diagnosis).trim()) {
    throw new ApiError(400, "Appointment ID and diagnosis are required", [], "MISSING_FIELDS");
  }

  // 1. Verify Appointment & Clinical Relationship
  const apptRes = await db
    .select({
      id: schema.appointments.id,
      patientId: schema.appointments.patientId,
      doctorId: schema.appointments.doctorId,
      status: schema.appointments.status,
      patientUserId: schema.patients.userId,
      doctorName: schema.users.name,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .innerJoin(schema.users, eq(schema.users.id, schema.doctors.userId))
    .where(and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.doctorId, doctorId)));

  if (!apptRes.length) {
    throw new ApiError(404, "Appointment not found or not assigned to you", [], "NOT_FOUND");
  }

  const appt = apptRes[0];

  if (appt.status === "CANCELLED") {
    throw new ApiError(400, "Cannot issue a prescription for a cancelled appointment", [], "INVALID_STATUS");
  }

  // 2. Insert Prescription & Items inside Transaction
  const result = await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: schema.prescriptions.id })
      .from(schema.prescriptions)
      .where(eq(schema.prescriptions.appointmentId, appointmentId));

    let prescriptionId;
    if (existing.length) {
      prescriptionId = existing[0].id;
      await tx
        .update(schema.prescriptions)
        .set({
          diagnosis,
          labTests,
          advice,
          followUpDate: followUpDate || null,
          nextVisitIn,
          notes,
          updatedAt: sql`NOW()`,
        })
        .where(eq(schema.prescriptions.id, prescriptionId));

      await tx
        .delete(schema.prescriptionItems)
        .where(eq(schema.prescriptionItems.prescriptionId, prescriptionId));
    } else {
      const pRes = await tx
        .insert(schema.prescriptions)
        .values({
          appointmentId,
          doctorId,
          patientId: appt.patientId,
          diagnosis,
          labTests,
          advice,
          followUpDate: followUpDate || null,
          nextVisitIn,
          notes,
          isSigned: true,
        })
        .returning({ id: schema.prescriptions.id });
      prescriptionId = pRes[0].id;
    }

    // Insert normalized items
    for (const med of medicines) {
      await tx.insert(schema.prescriptionItems).values({
        prescriptionId,
        medicineName: med.name || med.medicine_name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        instructions: med.instructions || "",
        quantity: med.quantity || 1,
      });
    }

    // Mark appointment as COMPLETED if not already
    await tx
      .update(schema.appointments)
      .set({ status: "COMPLETED", updatedAt: sql`NOW()` })
      .where(eq(schema.appointments.id, appointmentId));

    return { prescriptionId, doctorName: appt.doctorName, patientUserId: appt.patientUserId };
  });

  // 3. Dispatch Notification
  await notifyPrescriptionCreated(result.prescriptionId, result.patientUserId, result.doctorName);

  return { prescriptionId: result.prescriptionId };
};

// Get Prescriptions for Logged-In Patient
export const getPatientPrescriptions = async ({ patientUserId }) => {
  const presRes = await db
    .select({
      id: schema.prescriptions.id,
      appointmentId: schema.prescriptions.appointmentId,
      doctorId: schema.prescriptions.doctorId,
      patientId: schema.prescriptions.patientId,
      diagnosis: schema.prescriptions.diagnosis,
      labTests: schema.prescriptions.labTests,
      advice: schema.prescriptions.advice,
      followUpDate: schema.prescriptions.followUpDate,
      nextVisitIn: schema.prescriptions.nextVisitIn,
      isSigned: schema.prescriptions.isSigned,
      issuedAt: schema.prescriptions.createdAt,
      created_at: schema.prescriptions.createdAt,
      doctorName: sql`du.name`,
      doctorImage: sql`du.avatar_url`,
      doctorSpeciality: schema.specializations.name,
      patientName: sql`pu.name`,
    })
    .from(schema.prescriptions)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.prescriptions.patientId))
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.prescriptions.doctorId))
    .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .where(eq(schema.patients.userId, patientUserId))
    .orderBy(desc(schema.prescriptions.createdAt));

  const prescriptions = await Promise.all(
    presRes.map(async (row) => {
      const itemsRes = await db
        .select({
          id: schema.prescriptionItems.id,
          name: schema.prescriptionItems.medicineName,
          dosage: schema.prescriptionItems.dosage,
          frequency: schema.prescriptionItems.frequency,
          duration: schema.prescriptionItems.duration,
          instructions: schema.prescriptionItems.instructions,
          quantity: schema.prescriptionItems.quantity,
        })
        .from(schema.prescriptionItems)
        .where(eq(schema.prescriptionItems.prescriptionId, row.id));

      return {
        ...row,
        medicines: itemsRes,
      };
    })
  );

  return { prescriptions };
};

// Get Prescriptions Issued by Doctor
export const getDoctorPrescriptions = async ({ doctorId }) => {
  const presRes = await db
    .select({
      id: schema.prescriptions.id,
      appointmentId: schema.prescriptions.appointmentId,
      patientId: schema.prescriptions.patientId,
      diagnosis: schema.prescriptions.diagnosis,
      labTests: schema.prescriptions.labTests,
      advice: schema.prescriptions.advice,
      followUpDate: schema.prescriptions.followUpDate,
      nextVisitIn: schema.prescriptions.nextVisitIn,
      issuedAt: schema.prescriptions.createdAt,
      created_at: schema.prescriptions.createdAt,
      patientName: schema.users.name,
      patientEmail: schema.users.email,
      patientGender: schema.patients.gender,
      patientDob: schema.patients.dateOfBirth,
    })
    .from(schema.prescriptions)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.prescriptions.patientId))
    .innerJoin(schema.users, eq(schema.users.id, schema.patients.userId))
    .where(eq(schema.prescriptions.doctorId, doctorId))
    .orderBy(desc(schema.prescriptions.createdAt));

  const prescriptions = await Promise.all(
    presRes.map(async (row) => {
      const itemsRes = await db
        .select({
          id: schema.prescriptionItems.id,
          name: schema.prescriptionItems.medicineName,
          dosage: schema.prescriptionItems.dosage,
          frequency: schema.prescriptionItems.frequency,
          duration: schema.prescriptionItems.duration,
          instructions: schema.prescriptionItems.instructions,
          quantity: schema.prescriptionItems.quantity,
        })
        .from(schema.prescriptionItems)
        .where(eq(schema.prescriptionItems.prescriptionId, row.id));

      return {
        ...row,
        medicines: itemsRes,
      };
    })
  );

  return { prescriptions };
};

// Get Single Prescription by ID
export const getPrescriptionById = async ({ id, user }) => {
  const presRes = await db
    .select({
      id: schema.prescriptions.id,
      appointmentId: schema.prescriptions.appointmentId,
      doctorId: schema.prescriptions.doctorId,
      patientId: schema.prescriptions.patientId,
      diagnosis: schema.prescriptions.diagnosis,
      labTests: schema.prescriptions.labTests,
      advice: schema.prescriptions.advice,
      followUpDate: schema.prescriptions.followUpDate,
      nextVisitIn: schema.prescriptions.nextVisitIn,
      isSigned: schema.prescriptions.isSigned,
      issuedAt: schema.prescriptions.createdAt,
      created_at: schema.prescriptions.createdAt,
      doctorName: sql`du.name`,
      doctorDegree: schema.doctors.qualification,
      doctorSpeciality: schema.specializations.name,
      doctorRoom: schema.doctors.consultationRoom,
      doctorHospital: schema.doctors.hospitalAffiliation,
      patientName: sql`pu.name`,
      patientGender: schema.patients.gender,
      patientDob: schema.patients.dateOfBirth,
      patient_user_id: schema.patients.userId,
      doctor_user_id: schema.doctors.userId,
    })
    .from(schema.prescriptions)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.prescriptions.patientId))
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.prescriptions.doctorId))
    .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .where(eq(schema.prescriptions.id, id));

  if (!presRes.length) {
    throw new ApiError(404, "Prescription not found", [], "NOT_FOUND");
  }

  const p = presRes[0];

  const isOwnerPatient = user.role === "PATIENT" && p.patient_user_id === user.id;
  const isPrescribingDoc = user.role === "DOCTOR" && p.doctor_user_id === user.id;
  const isAdmin = user.role === "ADMIN";

  if (!isOwnerPatient && !isPrescribingDoc && !isAdmin) {
    throw new ApiError(403, "Forbidden: You are not authorized to view this prescription", [], "FORBIDDEN");
  }

  const medicines = await db
    .select({
      id: schema.prescriptionItems.id,
      name: schema.prescriptionItems.medicineName,
      dosage: schema.prescriptionItems.dosage,
      frequency: schema.prescriptionItems.frequency,
      duration: schema.prescriptionItems.duration,
      instructions: schema.prescriptionItems.instructions,
      quantity: schema.prescriptionItems.quantity,
    })
    .from(schema.prescriptionItems)
    .where(eq(schema.prescriptionItems.prescriptionId, id));

  return {
    prescription: {
      ...p,
      medicines,
    },
  };
};

export default {
  issuePrescription,
  getPatientPrescriptions,
  getDoctorPrescriptions,
  getPrescriptionById,
};
