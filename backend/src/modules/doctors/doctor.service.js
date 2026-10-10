import { db, schema } from "../../db/index.js";
import { eq, and, sql, desc, asc, ilike, or, gte } from "drizzle-orm";
import ApiError from "../../utils/ApiError.js";
import { getDoctorSlotsForDate } from "../appointments/appointment.service.js";

// Public: Get List of Approved Doctors with filters & pagination
export const getDoctors = async ({
  specialization,
  city,
  experience,
  rating,
  search,
  page = 1,
  limit = 10,
  sort = "rating_desc",
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [
    eq(schema.doctors.isApproved, true),
    eq(schema.users.isActive, true),
  ];

  if (specialization) {
    conditions.push(sql`LOWER(${schema.specializations.name}) = ${specialization.toLowerCase()}`);
  }

  if (city) {
    const cityPattern = `%${city.toLowerCase()}%`;
    conditions.push(
      or(
        sql`LOWER(${schema.doctors.address}->>'line1') LIKE ${cityPattern}`,
        sql`LOWER(${schema.doctors.address}->>'line2') LIKE ${cityPattern}`
      )
    );
  }

  if (experience) {
    conditions.push(gte(schema.doctors.experienceYears, parseInt(experience, 10)));
  }

  if (rating) {
    conditions.push(sql`${schema.doctors.avgRating} >= ${parseFloat(rating)}`);
  }

  if (search) {
    const searchPattern = `%${search.toLowerCase()}%`;
    conditions.push(
      or(
        ilike(schema.users.name, searchPattern),
        ilike(schema.specializations.name, searchPattern),
        ilike(schema.doctors.bio, searchPattern)
      )
    );
  }

  const whereCondition = and(...conditions);

  let orderClauses = [desc(schema.doctors.avgRating), desc(schema.doctors.experienceYears)];
  if (sort === "fee_asc") orderClauses = [asc(schema.doctors.consultationFee)];
  else if (sort === "fee_desc") orderClauses = [desc(schema.doctors.consultationFee)];
  else if (sort === "experience_desc") orderClauses = [desc(schema.doctors.experienceYears)];
  else if (sort === "name_asc") orderClauses = [asc(schema.users.name)];

  const countRes = await db
    .select({ total: sql`COUNT(*)::int` })
    .from(schema.doctors)
    .innerJoin(schema.users, eq(schema.users.id, schema.doctors.userId))
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .where(whereCondition);

  const total = countRes[0]?.total || 0;
  const totalPages = Math.ceil(total / limitNum);

  const doctorsRes = await db
    .select({
      id: schema.doctors.id,
      user_id: schema.doctors.userId,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      image: schema.users.avatarUrl,
      specialization_id: schema.specializations.id,
      speciality: schema.specializations.name,
      degree: schema.doctors.qualification,
      experience: schema.doctors.experienceYears,
      about: schema.doctors.bio,
      fees: schema.doctors.consultationFee,
      license_number: schema.doctors.licenseNumber,
      hospital_affiliation: schema.doctors.hospitalAffiliation,
      consultation_room: schema.doctors.consultationRoom,
      address: schema.doctors.address,
      available: schema.doctors.isAvailable,
      avgRating: schema.doctors.avgRating,
      totalReviews: schema.doctors.totalReviews,
      created_at: schema.doctors.createdAt,
    })
    .from(schema.doctors)
    .innerJoin(schema.users, eq(schema.users.id, schema.doctors.userId))
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .where(whereCondition)
    .orderBy(...orderClauses)
    .limit(limitNum)
    .offset(offset);

  return {
    doctors: doctorsRes,
    meta: { page: pageNum, limit: limitNum, total, totalPages },
  };
};

// Public: Get Specializations
export const getSpecializations = async () => {
  const result = await db
    .select({
      id: schema.specializations.id,
      name: schema.specializations.name,
      description: schema.specializations.description,
      doctor_count: sql`(SELECT COUNT(*) FROM doctors d WHERE d.specialization_id = ${schema.specializations.id} AND d.is_approved = true)::int`,
    })
    .from(schema.specializations)
    .orderBy(asc(schema.specializations.name));

  return { specializations: result };
};

// Public: Get Doctor Profile by ID
export const getDoctorById = async ({ id }) => {
  const docRes = await db
    .select({
      id: schema.doctors.id,
      user_id: schema.doctors.userId,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      image: schema.users.avatarUrl,
      specialization_id: schema.specializations.id,
      speciality: schema.specializations.name,
      degree: schema.doctors.qualification,
      experience: schema.doctors.experienceYears,
      about: schema.doctors.bio,
      fees: schema.doctors.consultationFee,
      license_number: schema.doctors.licenseNumber,
      hospital_affiliation: schema.doctors.hospitalAffiliation,
      consultation_room: schema.doctors.consultationRoom,
      address: schema.doctors.address,
      available: schema.doctors.isAvailable,
      avgRating: schema.doctors.avgRating,
      totalReviews: schema.doctors.totalReviews,
      created_at: schema.doctors.createdAt,
    })
    .from(schema.doctors)
    .innerJoin(schema.users, eq(schema.users.id, schema.doctors.userId))
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .where(eq(schema.doctors.id, id));

  if (!docRes.length) {
    throw new ApiError(404, "Doctor not found", [], "DOCTOR_NOT_FOUND");
  }

  const reviewsRes = await db
    .select({
      id: schema.reviews.id,
      rating: schema.reviews.rating,
      comment: schema.reviews.comment,
      created_at: schema.reviews.createdAt,
      is_anonymous: schema.reviews.isAnonymous,
      userName: sql`CASE WHEN ${schema.reviews.isAnonymous} THEN 'Anonymous Patient' ELSE ${schema.users.name} END`,
    })
    .from(schema.reviews)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.reviews.patientId))
    .innerJoin(schema.users, eq(schema.users.id, schema.patients.userId))
    .where(and(eq(schema.reviews.doctorId, id), eq(schema.reviews.isApproved, true)))
    .orderBy(desc(schema.reviews.createdAt))
    .limit(10);

  const doctorData = {
    ...docRes[0],
    reviews: reviewsRes,
  };

  return { doctor: doctorData, docData: doctorData };
};

// Public: Get Doctor Availability Slots
export const getDoctorAvailability = async ({ id, date }) => {
  if (!date) {
    throw new ApiError(400, "Date query parameter is required (YYYY-MM-DD)", [], "MISSING_DATE");
  }
  return await getDoctorSlotsForDate(id, date);
};

// Doctor: Get Analytics & Dashboard Metrics
export const getDoctorAnalytics = async ({ doctorId, period = "month" }) => {
  const statsRes = await db
    .select({
      total_appointments: sql`COUNT(*)::int`,
      completed_appointments: sql`COUNT(*) FILTER (WHERE ${schema.appointments.status} = 'COMPLETED')::int`,
      cancelled_appointments: sql`COUNT(*) FILTER (WHERE ${schema.appointments.status} = 'CANCELLED')::int`,
      upcoming_appointments: sql`COUNT(*) FILTER (WHERE ${schema.appointments.status} = 'CONFIRMED')::int`,
      noshow_appointments: sql`COUNT(*) FILTER (WHERE ${schema.appointments.status} = 'NO_SHOW')::int`,
      today_appointments: sql`COUNT(*) FILTER (WHERE ${schema.appointments.appointmentDate} = CURRENT_DATE AND ${schema.appointments.status} = 'CONFIRMED')::int`,
      total_earnings: sql`COALESCE(SUM(${schema.appointments.amount}) FILTER (WHERE ${schema.appointments.status} = 'COMPLETED'), 0)::numeric`,
      total_patients: sql`COUNT(DISTINCT ${schema.appointments.patientId})::int`,
    })
    .from(schema.appointments)
    .where(eq(schema.appointments.doctorId, doctorId));

  const stats = statsRes[0];

  const totalAppts = parseInt(stats.total_appointments, 10) || 0;
  const cancelledAppts = parseInt(stats.cancelled_appointments, 10) || 0;
  const cancellationRate = totalAppts > 0 ? Math.round((cancelledAppts / totalAppts) * 100) : 0;

  const latestRes = await db
    .select({
      id: schema.appointments.id,
      slotDate: schema.appointments.appointmentDate,
      slotTime: schema.appointments.startTime,
      type: schema.appointments.appointmentType,
      status: schema.appointments.status,
      amount: schema.appointments.amount,
      reason: schema.appointments.reason,
      userData: sql`json_build_object('name', ${schema.users.name}, 'email', ${schema.users.email}, 'phone', ${schema.appointments.patientPhone})`,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(schema.users, eq(schema.users.id, schema.patients.userId))
    .where(eq(schema.appointments.doctorId, doctorId))
    .orderBy(desc(schema.appointments.appointmentDate), desc(schema.appointments.startTime))
    .limit(5);

  const dashData = {
    earnings: parseFloat(stats.total_earnings),
    appointments: totalAppts,
    patients: parseInt(stats.total_patients, 10),
    completedAppointments: parseInt(stats.completed_appointments, 10),
    cancelledAppointments: cancelledAppts,
    upcomingAppointments: parseInt(stats.upcoming_appointments, 10),
    todayAppointments: parseInt(stats.today_appointments, 10),
    cancellationRate: `${cancellationRate}%`,
    latestAppointments: latestRes,
  };

  return { dashData };
};

// Doctor: Get Own Profile
export const getMyDoctorProfile = async ({ doctorId }) => {
  const docRes = await db
    .select({
      id: schema.doctors.id,
      user_id: schema.doctors.userId,
      specialization_id: schema.doctors.specializationId,
      qualification: schema.doctors.qualification,
      experience_years: schema.doctors.experienceYears,
      bio: schema.doctors.bio,
      consultation_fee: schema.doctors.consultationFee,
      license_number: schema.doctors.licenseNumber,
      is_approved: schema.doctors.isApproved,
      is_available: schema.doctors.isAvailable,
      hospital_affiliation: schema.doctors.hospitalAffiliation,
      consultation_room: schema.doctors.consultationRoom,
      address: schema.doctors.address,
      avg_rating: schema.doctors.avgRating,
      total_reviews: schema.doctors.totalReviews,
      created_at: schema.doctors.createdAt,
      updated_at: schema.doctors.updatedAt,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      image: schema.users.avatarUrl,
      speciality: schema.specializations.name,
    })
    .from(schema.doctors)
    .innerJoin(schema.users, eq(schema.users.id, schema.doctors.userId))
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .where(eq(schema.doctors.id, doctorId));

  if (!docRes.length) {
    throw new ApiError(404, "Doctor profile not found", [], "DOCTOR_NOT_FOUND");
  }

  const availRes = await db
    .select({
      id: schema.doctorAvailability.id,
      day_of_week: schema.doctorAvailability.dayOfWeek,
      start_time: schema.doctorAvailability.startTime,
      end_time: schema.doctorAvailability.endTime,
      slot_duration_minutes: schema.doctorAvailability.slotDurationMinutes,
      is_active: schema.doctorAvailability.isActive,
    })
    .from(schema.doctorAvailability)
    .where(eq(schema.doctorAvailability.doctorId, doctorId))
    .orderBy(
      sql`CASE ${schema.doctorAvailability.dayOfWeek}
        WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
      END`
    );

  const profileData = {
    ...docRes[0],
    availability: availRes,
  };

  return { profileData };
};

// Doctor: Update Profile
export const updateDoctorProfile = async ({
  doctorId,
  fees,
  address,
  available,
  is_available,
  bio,
  hospital_affiliation,
  consultation_room,
}) => {
  const updateValues = {
    updatedAt: sql`NOW()`,
  };

  if (fees !== undefined) updateValues.consultationFee = String(fees);
  if (address !== undefined) {
    updateValues.address = typeof address === "string" ? JSON.parse(address) : address;
  }
  if (available !== undefined || is_available !== undefined) {
    updateValues.isAvailable = available ?? is_available;
  }
  if (bio !== undefined) updateValues.bio = bio;
  if (hospital_affiliation !== undefined) updateValues.hospitalAffiliation = hospital_affiliation;
  if (consultation_room !== undefined) updateValues.consultationRoom = consultation_room;

  await db
    .update(schema.doctors)
    .set(updateValues)
    .where(eq(schema.doctors.id, doctorId));
};

// Doctor: Get Leaves
export const getDoctorLeaves = async ({ doctorId }) => {
  const leaves = await db
    .select()
    .from(schema.doctorLeaveBlocks)
    .where(eq(schema.doctorLeaveBlocks.doctorId, doctorId))
    .orderBy(asc(schema.doctorLeaveBlocks.leaveDate));

  return { leaves };
};

// Doctor: Add Leave
export const addDoctorLeave = async ({ doctorId, leaveDate, isFullDay = true, startTime, endTime, reason = "" }) => {
  if (!leaveDate) {
    throw new ApiError(400, "Leave date is required", [], "MISSING_DATE");
  }

  const result = await db
    .insert(schema.doctorLeaveBlocks)
    .values({
      doctorId,
      leaveDate,
      isFullDay,
      startTime: startTime || null,
      endTime: endTime || null,
      reason,
    })
    .returning();

  return { leave: result[0] };
};

// Doctor: Remove Leave
export const removeDoctorLeave = async ({ doctorId, id }) => {
  await db
    .delete(schema.doctorLeaveBlocks)
    .where(
      and(
        eq(schema.doctorLeaveBlocks.id, id),
        eq(schema.doctorLeaveBlocks.doctorId, doctorId)
      )
    );
};

// Toggle Availability (Doctor Self)
export const changeAvailability = async ({ doctorId }) => {
  if (!doctorId) {
    throw new ApiError(403, "Forbidden: Doctor account required");
  }

  const [updated] = await db
    .update(schema.doctors)
    .set({
      isAvailable: sql`NOT ${schema.doctors.isAvailable}`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(schema.doctors.id, doctorId))
    .returning();

  if (!updated) {
    throw new ApiError(404, "Doctor profile not found");
  }

  return { isAvailable: updated.isAvailable };
};

// Toggle Availability (Admin for any doctor)
export const adminChangeAvailability = async ({ targetId }) => {
  if (!targetId) {
    throw new ApiError(400, "Doctor ID is required");
  }

  const [updated] = await db
    .update(schema.doctors)
    .set({
      isAvailable: sql`NOT ${schema.doctors.isAvailable}`,
      updatedAt: sql`NOW()`,
    })
    .where(eq(schema.doctors.id, targetId))
    .returning();

  if (!updated) {
    throw new ApiError(404, "Doctor profile not found");
  }

  return { isAvailable: updated.isAvailable };
};

export default {
  getDoctors,
  getSpecializations,
  getDoctorById,
  getDoctorAvailability,
  getDoctorAnalytics,
  getMyDoctorProfile,
  updateDoctorProfile,
  getDoctorLeaves,
  addDoctorLeave,
  removeDoctorLeave,
  changeAvailability,
  adminChangeAvailability,
};
