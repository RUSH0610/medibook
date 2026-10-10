import bcrypt from "bcrypt";
import { db, schema } from "../../db/index.js";
import { eq, and, sql, desc } from "drizzle-orm";
import { uploadBuffer } from "../../utils/cloudinaryUpload.js";
import ApiError from "../../utils/ApiError.js";
import { notifyDoctorApproval, notifyAccountStatus } from "../notifications/notification.service.js";

// Fetch aggregation metrics for the Admin Dashboard
export const getAdminDashboard = async () => {
  const countsRes = await db.select({
    total_patients: sql`(SELECT COUNT(*) FROM patients)::int`,
    total_doctors: sql`(SELECT COUNT(*) FROM doctors)::int`,
    approved_doctors: sql`(SELECT COUNT(*) FROM doctors WHERE is_approved = true)::int`,
    pending_doctors: sql`(SELECT COUNT(*) FROM doctors WHERE is_approved = false)::int`,
    active_users: sql`(SELECT COUNT(*) FROM users WHERE is_active = true)::int`,
    total_appointments: sql`(SELECT COUNT(*) FROM appointments)::int`,
    today_appointments: sql`(SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE AND status = 'CONFIRMED')::int`,
    completed_appointments: sql`(SELECT COUNT(*) FROM appointments WHERE status = 'COMPLETED')::int`,
    cancelled_appointments: sql`(SELECT COUNT(*) FROM appointments WHERE status = 'CANCELLED')::int`,
    total_earnings: sql`(SELECT COALESCE(SUM(amount), 0) FROM appointments WHERE status = 'COMPLETED')::numeric`,
  }).from(sql`(SELECT 1) as dummy`);

  const specDistRes = await db
    .select({
      speciality: schema.specializations.name,
      count: sql`COUNT(${schema.doctors.id})::int`,
    })
    .from(schema.specializations)
    .leftJoin(
      schema.doctors,
      and(
        eq(schema.doctors.specializationId, schema.specializations.id),
        eq(schema.doctors.isApproved, true)
      )
    )
    .groupBy(schema.specializations.id, schema.specializations.name)
    .orderBy(sql`count DESC`);

  const statusDistRes = await db
    .select({
      status: schema.appointments.status,
      count: sql`COUNT(*)::int`,
    })
    .from(schema.appointments)
    .groupBy(schema.appointments.status);

  const latestRes = await db
    .select({
      id: schema.appointments.id,
      slotDate: schema.appointments.appointmentDate,
      slotTime: schema.appointments.startTime,
      type: schema.appointments.appointmentType,
      status: schema.appointments.status,
      amount: schema.appointments.amount,
      patientName: sql`pu.name`,
      patientEmail: sql`pu.email`,
      doctorName: sql`du.name`,
      doctorImage: sql`du.avatar_url`,
      doctorSpeciality: schema.specializations.name,
      userData: sql`json_build_object('name', pu.name, 'email', pu.email, 'image', pu.avatar_url)`,
      docData: sql`json_build_object('name', du.name, 'image', du.avatar_url, 'speciality', ${schema.specializations.name})`,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .orderBy(desc(schema.appointments.createdAt))
    .limit(10);

  const counts = countsRes[0];

  const dashData = {
    patients: parseInt(counts.total_patients, 10),
    doctors: parseInt(counts.total_doctors, 10),
    approvedDoctors: parseInt(counts.approved_doctors, 10),
    pendingDoctors: parseInt(counts.pending_doctors, 10),
    activeUsers: parseInt(counts.active_users, 10),
    appointments: parseInt(counts.total_appointments, 10),
    todayAppointments: parseInt(counts.today_appointments, 10),
    completedAppointments: parseInt(counts.completed_appointments, 10),
    cancelledAppointments: parseInt(counts.cancelled_appointments, 10),
    earnings: parseFloat(counts.total_earnings),
    specializationDistribution: specDistRes,
    appointmentStatusDistribution: statusDistRes,
    latestAppointments: latestRes,
  };

  return { dashData };
};

// Find or create specialization ID
export const findOrCreateSpecialization = async (specialityName) => {
  const specRes = await db
    .select({ id: schema.specializations.id })
    .from(schema.specializations)
    .where(sql`LOWER(${schema.specializations.name}) = LOWER(${specialityName})`);

  if (specRes.length) {
    return specRes[0].id;
  }

  const newSpec = await db
    .insert(schema.specializations)
    .values({ name: specialityName })
    .returning({ id: schema.specializations.id });

  return newSpec[0].id;
};

// Admin registers a new doctor
export const addDoctor = async ({
  name,
  email,
  password,
  speciality,
  degree,
  experience,
  about,
  fees,
  address,
  hospitalAffiliation = "",
  consultationRoom = "",
  imageFile,
}) => {
  if (!name || !email || !password || !speciality || !degree || !about || !fees) {
    throw new ApiError(400, "Missing required doctor registration fields", [], "MISSING_FIELDS");
  }

  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, email));

  if (existing.length) {
    throw new ApiError(400, "Email already registered in system", [], "EMAIL_EXISTS");
  }

  let imageUrl = "";
  if (imageFile) {
    const uploadResult = await uploadBuffer(imageFile.buffer, {
      folder: "medibook/doctors",
      resource_type: "image",
    });
    imageUrl = uploadResult.secure_url;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const specId = await findOrCreateSpecialization(speciality);
  const parsedAddress = typeof address === "string" ? address : JSON.stringify(address || { line1: "", line2: "" });
  const experienceYears = parseInt(experience, 10) || 1;
  const feeNum = parseFloat(fees) || 50.0;
  const parsedAddressObj = typeof parsedAddress === "string" ? JSON.parse(parsedAddress) : parsedAddress;
  const licenseNumber = `DOC-${Math.floor(10000 + Math.random() * 90000)}`;

  await db.transaction(async (tx) => {
    const uRes = await tx
      .insert(schema.users)
      .values({
        name,
        email,
        passwordHash,
        role: "DOCTOR",
        avatarUrl: imageUrl,
        isActive: true,
        isVerified: true,
      })
      .returning({ id: schema.users.id });
    const userId = uRes[0].id;

    const dRes = await tx
      .insert(schema.doctors)
      .values({
        userId,
        specializationId: specId,
        qualification: degree,
        experienceYears,
        bio: about,
        consultationFee: String(feeNum),
        licenseNumber,
        hospitalAffiliation,
        consultationRoom,
        address: parsedAddressObj,
        isApproved: true,
        isAvailable: true,
      })
      .returning({ id: schema.doctors.id });
    const doctorId = dRes[0].id;

    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    for (const day of weekDays) {
      await tx.insert(schema.doctorAvailability).values({
        doctorId,
        dayOfWeek: day,
        startTime: "09:00:00",
        endTime: "17:00:00",
        slotDurationMinutes: 30,
        isActive: true,
      });
    }

    return { userId, doctorId };
  });
};

// Fetch all doctors for admin list
export const getAllDoctorsAdmin = async () => {
  const doctors = await db
    .select({
      id: schema.doctors.id,
      user_id: schema.doctors.userId,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      image: schema.users.avatarUrl,
      speciality: schema.specializations.name,
      degree: schema.doctors.qualification,
      experience: schema.doctors.experienceYears,
      about: schema.doctors.bio,
      fees: schema.doctors.consultationFee,
      license_number: schema.doctors.licenseNumber,
      is_approved: schema.doctors.isApproved,
      available: schema.doctors.isAvailable,
      address: schema.doctors.address,
      created_at: schema.doctors.createdAt,
    })
    .from(schema.doctors)
    .innerJoin(schema.users, eq(schema.users.id, schema.doctors.userId))
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .orderBy(desc(schema.doctors.createdAt));

  return { doctors };
};

// Toggle doctor approval status
export const toggleDoctorApproval = async ({ targetId }) => {
  const res = await db
    .update(schema.doctors)
    .set({
      isApproved: sql`NOT ${schema.doctors.isApproved}`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(schema.doctors.id, targetId))
    .returning({
      id: schema.doctors.id,
      user_id: schema.doctors.userId,
      is_approved: schema.doctors.isApproved,
    });

  if (!res.length) {
    throw new ApiError(404, "Doctor not found", [], "NOT_FOUND");
  }

  const { user_id, is_approved } = res[0];
  await notifyDoctorApproval(user_id, is_approved);

  return { isApproved: is_approved };
};

// Fetch all users for admin
export const getAllUsersAdmin = async () => {
  const users = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      role: schema.users.role,
      phone: schema.users.phone,
      is_active: schema.users.isActive,
      is_verified: schema.users.isVerified,
      created_at: schema.users.createdAt,
    })
    .from(schema.users)
    .orderBy(desc(schema.users.createdAt));

  return { users };
};

// Toggle user active status
export const toggleUserStatus = async ({ targetId, currentUserId }) => {
  if (targetId === currentUserId) {
    throw new ApiError(400, "You cannot deactivate your own account", [], "SELF_DEACTIVATION");
  }

  const res = await db
    .update(schema.users)
    .set({
      isActive: sql`NOT ${schema.users.isActive}`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(schema.users.id, targetId))
    .returning({
      id: schema.users.id,
      is_active: schema.users.isActive,
      email: schema.users.email,
    });

  if (!res.length) {
    throw new ApiError(404, "User not found", [], "NOT_FOUND");
  }

  const { is_active } = res[0];
  await notifyAccountStatus(targetId, is_active);

  return { isActive: is_active };
};

// Fetch all appointments for admin
export const getAllAppointmentsAdmin = async () => {
  const appointments = await db
    .select({
      id: schema.appointments.id,
      slotDate: schema.appointments.appointmentDate,
      slotTime: schema.appointments.startTime,
      type: schema.appointments.appointmentType,
      status: schema.appointments.status,
      amount: schema.appointments.amount,
      reason: schema.appointments.reason,
      cancelled: sql`CASE WHEN ${schema.appointments.status} = 'CANCELLED' THEN true ELSE false END`,
      isCompleted: sql`CASE WHEN ${schema.appointments.status} = 'COMPLETED' THEN true ELSE false END`,
      patientName: sql`pu.name`,
      patientEmail: sql`pu.email`,
      doctorName: sql`du.name`,
      doctorImage: sql`du.avatar_url`,
      doctorSpeciality: schema.specializations.name,
      userData: sql`json_build_object('name', pu.name, 'email', pu.email, 'image', pu.avatar_url)`,
      docData: sql`json_build_object('name', du.name, 'image', du.avatar_url, 'speciality', ${schema.specializations.name}, 'fees', ${schema.doctors.consultationFee})`,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.appointments.doctorId))
    .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .orderBy(desc(schema.appointments.appointmentDate), desc(schema.appointments.startTime));

  return { appointments };
};

export default {
  getAdminDashboard,
  addDoctor,
  getAllDoctorsAdmin,
  toggleDoctorApproval,
  getAllUsersAdmin,
  toggleUserStatus,
  getAllAppointmentsAdmin,
};
