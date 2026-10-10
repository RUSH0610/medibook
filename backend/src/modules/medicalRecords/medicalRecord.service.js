import { v2 as cloudinary } from "cloudinary";
import { db, schema } from "../../db/index.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { uploadBuffer } from "../../utils/cloudinaryUpload.js";
import ApiError from "../../utils/ApiError.js";
import { notifyMedicalRecordUploaded } from "../notifications/notification.service.js";

// Helper to generate authenticated short-lived signed URLs (1 hour expiry)
export const getSignedRecordUrl = (record) => {
  if (!record.cloudinaryPublicId && !record.cloudinary_public_id) {
    return record.fileUrl || record.file_url;
  }
  const publicId = record.cloudinaryPublicId || record.cloudinary_public_id;
  const rawType = record.fileType || record.file_type;
  const resourceType = rawType === "raw" ? "raw" : "image";

  try {
    return cloudinary.url(publicId, {
      type: "authenticated",
      sign_url: true,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      secure: true,
      resource_type: resourceType,
    });
  } catch (err) {
    console.warn("[Cloudinary] Failed to sign URL, falling back to stored URL:", err.message);
    return record.fileUrl || record.file_url;
  }
};

// Upload Medical Record
export const uploadRecord = async ({
  patientUserId,
  file,
  title,
  category,
  recordType,
  description = "",
  notes = "",
  appointmentId,
}) => {
  if (!file) {
    throw new ApiError(400, "No file uploaded", [], "MISSING_FILE");
  }

  const targetTitle = title || "Medical Document";
  const targetCategory = recordType || category || "Other";
  const targetDescription = description || notes || "";

  // 1. Resolve Patient ID
  const pRes = await db
    .select({ id: schema.patients.id })
    .from(schema.patients)
    .where(eq(schema.patients.userId, patientUserId));

  if (!pRes.length) {
    throw new ApiError(400, "Patient profile not found", [], "PATIENT_NOT_FOUND");
  }
  const patientId = pRes[0].id;

  if (appointmentId) {
    const apptCheck = await db
      .select({ id: schema.appointments.id })
      .from(schema.appointments)
      .where(and(eq(schema.appointments.id, appointmentId), eq(schema.appointments.patientId, patientId)));
    if (!apptCheck.length) {
      throw new ApiError(400, "Linked appointment not found for this patient", [], "INVALID_APPOINTMENT");
    }
  }

  // 2. Upload to Cloudinary with authenticated delivery
  let uploadResult;
  try {
    uploadResult = await uploadBuffer(file.buffer, {
      folder: "medibook/medical_records",
      type: "authenticated",
      resource_type: "auto",
    });
  } catch (err) {
    console.error("[Cloudinary] Upload failed:", err);
    throw new ApiError(500, "File upload service failed", [], "UPLOAD_FAILED");
  }

  const fileType = file.mimetype?.includes("pdf") ? "pdf" : "image";

  // 3. Insert into PostgreSQL
  const recRes = await db
    .insert(schema.medicalRecords)
    .values({
      patientId,
      appointmentId: appointmentId || null,
      recordType: targetCategory,
      title: targetTitle,
      description: targetDescription,
      fileUrl: uploadResult.secure_url,
      fileType,
      cloudinaryPublicId: uploadResult.public_id,
    })
    .returning();

  const record = recRes[0];
  const signedUrl = getSignedRecordUrl(record);

  await notifyMedicalRecordUploaded(record.id, patientUserId, targetTitle);

  return {
    record: {
      ...record,
      fileUrl: signedUrl,
    },
  };
};

// Get Patient's Medical Records with signed URLs
export const getPatientRecords = async ({ patientUserId }) => {
  const recRes = await db
    .select({
      id: schema.medicalRecords.id,
      patient_id: schema.medicalRecords.patientId,
      doctor_id: schema.medicalRecords.doctorId,
      appointment_id: schema.medicalRecords.appointmentId,
      record_type: schema.medicalRecords.recordType,
      category: schema.medicalRecords.recordType,
      title: schema.medicalRecords.title,
      description: schema.medicalRecords.description,
      notes: schema.medicalRecords.description,
      file_url: schema.medicalRecords.fileUrl,
      fileUrl: schema.medicalRecords.fileUrl,
      file_type: schema.medicalRecords.fileType,
      fileType: schema.medicalRecords.fileType,
      cloudinary_public_id: schema.medicalRecords.cloudinaryPublicId,
      cloudinaryPublicId: schema.medicalRecords.cloudinaryPublicId,
      is_shared_with_doctor: schema.medicalRecords.isSharedWithDoctor,
      shared_with_doctors: schema.medicalRecords.sharedWithDoctors,
      created_at: schema.medicalRecords.createdAt,
      updated_at: schema.medicalRecords.updatedAt,
      recordDate: schema.medicalRecords.createdAt,
    })
    .from(schema.medicalRecords)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.medicalRecords.patientId))
    .where(eq(schema.patients.userId, patientUserId))
    .orderBy(desc(schema.medicalRecords.createdAt));

  const records = recRes.map((r) => {
    const signedUrl = getSignedRecordUrl(r);
    return {
      ...r,
      file_url: signedUrl,
      fileUrl: signedUrl,
    };
  });

  return { records };
};

// Patient Medical Timeline API
export const getPatientTimeline = async ({ patientUserId, type }) => {
  const pRes = await db
    .select({ id: schema.patients.id })
    .from(schema.patients)
    .where(eq(schema.patients.userId, patientUserId));

  if (!pRes.length) {
    throw new ApiError(404, "Patient profile not found", [], "PATIENT_NOT_FOUND");
  }
  const patientId = pRes[0].id;

  const timelineItems = [];

  // 1. Appointments
  if (!type || type === "all" || type === "appointments") {
    const appts = await db
      .select({
        id: schema.appointments.id,
        appointment_date: schema.appointments.appointmentDate,
        start_time: schema.appointments.startTime,
        status: schema.appointments.status,
        reason: schema.appointments.reason,
        appointment_type: schema.appointments.appointmentType,
        doctor_name: sql`du.name`,
        speciality: schema.specializations.name,
        doctor_image: sql`du.avatar_url`,
        created_at: schema.appointments.createdAt,
      })
      .from(schema.appointments)
      .innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
      .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
      .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
      .where(eq(schema.appointments.patientId, patientId))
      .orderBy(desc(schema.appointments.appointmentDate));

    for (const a of appts) {
      timelineItems.push({
        id: a.id,
        eventType: "APPOINTMENT",
        title: `Appointment with Dr. ${a.doctor_name}`,
        subtitle: a.speciality,
        date: a.appointment_date,
        time: a.start_time,
        status: a.status,
        details: a.reason || "Consultation visit",
        image: a.doctor_image,
        timestamp: new Date(`${a.appointment_date}T${a.start_time || "00:00:00"}`).getTime(),
      });
    }
  }

  // 2. Prescriptions
  if (!type || type === "all" || type === "prescriptions") {
    const prescriptions = await db
      .select({
        id: schema.prescriptions.id,
        diagnosis: schema.prescriptions.diagnosis,
        created_at: schema.prescriptions.createdAt,
        doctor_name: sql`du.name`,
        speciality: schema.specializations.name,
      })
      .from(schema.prescriptions)
      .innerJoin(schema.doctors, eq(schema.doctors.id, schema.prescriptions.doctorId))
      .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
      .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
      .where(eq(schema.prescriptions.patientId, patientId))
      .orderBy(desc(schema.prescriptions.createdAt));

    for (const pr of prescriptions) {
      const createdAtDate = new Date(pr.created_at);
      timelineItems.push({
        id: pr.id,
        eventType: "PRESCRIPTION",
        title: `Prescription issued by Dr. ${pr.doctor_name}`,
        subtitle: `Diagnosis: ${pr.diagnosis}`,
        date: createdAtDate.toISOString().split("T")[0],
        time: createdAtDate.toISOString().split("T")[1].substring(0, 5),
        status: "ISSUED",
        details: pr.diagnosis,
        timestamp: createdAtDate.getTime(),
      });
    }
  }

  // 3. Medical Records
  if (!type || type === "all" || type === "records") {
    const records = await db
      .select({
        id: schema.medicalRecords.id,
        record_type: schema.medicalRecords.recordType,
        title: schema.medicalRecords.title,
        description: schema.medicalRecords.description,
        file_url: schema.medicalRecords.fileUrl,
        fileUrl: schema.medicalRecords.fileUrl,
        file_type: schema.medicalRecords.fileType,
        fileType: schema.medicalRecords.fileType,
        cloudinary_public_id: schema.medicalRecords.cloudinaryPublicId,
        cloudinaryPublicId: schema.medicalRecords.cloudinaryPublicId,
        created_at: schema.medicalRecords.createdAt,
      })
      .from(schema.medicalRecords)
      .where(eq(schema.medicalRecords.patientId, patientId))
      .orderBy(desc(schema.medicalRecords.createdAt));

    for (const r of records) {
      const createdAtDate = new Date(r.created_at);
      const signedUrl = getSignedRecordUrl(r);
      timelineItems.push({
        id: r.id,
        eventType: "RECORD",
        title: `${r.record_type}: ${r.title}`,
        subtitle: r.description || "Health Record Upload",
        date: createdAtDate.toISOString().split("T")[0],
        time: createdAtDate.toISOString().split("T")[1].substring(0, 5),
        status: "UPLOADED",
        fileUrl: signedUrl,
        fileType: r.file_type || r.fileType,
        timestamp: createdAtDate.getTime(),
      });
    }
  }

  timelineItems.sort((a, b) => b.timestamp - a.timestamp);

  return { timeline: timelineItems };
};

// Share Record with Doctor
export const shareWithDoctor = async ({ patientUserId, recordId, doctorId }) => {
  if (!recordId || !doctorId) {
    throw new ApiError(400, "Record ID and Doctor ID are required", [], "MISSING_FIELDS");
  }

  const recRes = await db
    .select({
      id: schema.medicalRecords.id,
      shared_with_doctors: schema.medicalRecords.sharedWithDoctors,
    })
    .from(schema.medicalRecords)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.medicalRecords.patientId))
    .where(
      and(
        eq(schema.medicalRecords.id, recordId),
        eq(schema.patients.userId, patientUserId)
      )
    );

  if (!recRes.length) {
    throw new ApiError(404, "Medical record not found or unauthorized", [], "NOT_FOUND");
  }

  const docCheck = await db
    .select({ id: schema.doctors.id })
    .from(schema.doctors)
    .where(eq(schema.doctors.id, doctorId));
  if (!docCheck.length) {
    throw new ApiError(404, "Doctor not found", [], "DOCTOR_NOT_FOUND");
  }

  await db
    .update(schema.medicalRecords)
    .set({
      sharedWithDoctors: sql`array_append(array_remove(${schema.medicalRecords.sharedWithDoctors}, ${doctorId}::uuid), ${doctorId}::uuid)`,
      isSharedWithDoctor: true,
      updatedAt: sql`NOW()`,
    })
    .where(eq(schema.medicalRecords.id, recordId));
};

// Doctor Views Records Shared with Them
export const getDoctorSharedRecords = async ({ doctorId }) => {
  const recordsRes = await db
    .select({
      id: schema.medicalRecords.id,
      patient_id: schema.medicalRecords.patientId,
      doctor_id: schema.medicalRecords.doctorId,
      appointment_id: schema.medicalRecords.appointmentId,
      record_type: schema.medicalRecords.recordType,
      category: schema.medicalRecords.recordType,
      title: schema.medicalRecords.title,
      description: schema.medicalRecords.description,
      notes: schema.medicalRecords.description,
      file_url: schema.medicalRecords.fileUrl,
      fileUrl: schema.medicalRecords.fileUrl,
      file_type: schema.medicalRecords.fileType,
      fileType: schema.medicalRecords.fileType,
      cloudinary_public_id: schema.medicalRecords.cloudinaryPublicId,
      cloudinaryPublicId: schema.medicalRecords.cloudinaryPublicId,
      is_shared_with_doctor: schema.medicalRecords.isSharedWithDoctor,
      shared_with_doctors: schema.medicalRecords.sharedWithDoctors,
      created_at: schema.medicalRecords.createdAt,
      updated_at: schema.medicalRecords.updatedAt,
      recordDate: schema.medicalRecords.createdAt,
      patientName: sql`pu.name`,
      patientEmail: sql`pu.email`,
      patientGender: schema.patients.gender,
      patientDob: schema.patients.dateOfBirth,
    })
    .from(schema.medicalRecords)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.medicalRecords.patientId))
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .where(
      sql`${doctorId}::uuid = ANY(${schema.medicalRecords.sharedWithDoctors}) OR ${schema.medicalRecords.doctorId} = ${doctorId}`
    )
    .orderBy(desc(schema.medicalRecords.createdAt));

  const records = recordsRes.map((r) => {
    const signedUrl = getSignedRecordUrl(r);
    return {
      ...r,
      file_url: signedUrl,
      fileUrl: signedUrl,
    };
  });

  return { records };
};

// Delete Medical Record with Cloudinary Asset Cleanup (authenticated, image & raw fallback)
export const deleteRecord = async ({ recordId, patientUserId, user }) => {
  const conditions = [eq(schema.medicalRecords.id, recordId)];
  if (user?.role !== "ADMIN") {
    conditions.push(eq(schema.patients.userId, patientUserId));
  }

  const recRes = await db
    .select({
      id: schema.medicalRecords.id,
      cloudinary_public_id: schema.medicalRecords.cloudinaryPublicId,
      file_type: schema.medicalRecords.fileType,
    })
    .from(schema.medicalRecords)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.medicalRecords.patientId))
    .where(and(...conditions));

  if (!recRes.length) {
    throw new ApiError(404, "Record not found or unauthorized", [], "NOT_FOUND");
  }

  const { cloudinary_public_id, file_type } = recRes[0];

  if (cloudinary_public_id) {
    try {
      // 1. Try authenticated image
      let res = await cloudinary.uploader.destroy(cloudinary_public_id, {
        type: "authenticated",
        resource_type: "image",
      });
      // 2. Try authenticated raw
      if (res?.result === "not found") {
        res = await cloudinary.uploader.destroy(cloudinary_public_id, {
          type: "authenticated",
          resource_type: "raw",
        });
      }
      // 3. Fallback to public image
      if (res?.result === "not found") {
        res = await cloudinary.uploader.destroy(cloudinary_public_id, {
          resource_type: "image",
        });
      }
      // 4. Fallback to public raw
      if (res?.result === "not found") {
        await cloudinary.uploader.destroy(cloudinary_public_id, {
          resource_type: "raw",
        });
      }
    } catch (err) {
      console.warn("[Cloudinary] Failed to delete remote asset:", err.message);
    }
  }

  await db.delete(schema.medicalRecords).where(eq(schema.medicalRecords.id, recordId));
};

export default {
  getSignedRecordUrl,
  uploadRecord,
  getPatientRecords,
  getPatientTimeline,
  shareWithDoctor,
  getDoctorSharedRecords,
  deleteRecord,
};
