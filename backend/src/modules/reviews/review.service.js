import { db, schema } from "../../db/index.js";
import { eq, and, sql, desc } from "drizzle-orm";
import ApiError from "../../utils/ApiError.js";

// Submit Review for a Completed Consultation
export const submitReview = async ({
  patientUserId,
  doctorId,
  appointmentId,
  rating,
  comment = "",
  isAnonymous = false,
}) => {
  const ratingNum = Number(rating);
  if (!appointmentId || !Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    throw new ApiError(400, "Appointment ID and an integer rating between 1 and 5 are required", [], "INVALID_RATING");
  }

  // 1. Verify Appointment Ownership and Completion
  const apptRes = await db
    .select({
      id: schema.appointments.id,
      doctorId: schema.appointments.doctorId,
      patientId: schema.appointments.patientId,
      status: schema.appointments.status,
      patient_user_id: schema.patients.userId,
      patient_name: schema.users.name,
    })
    .from(schema.appointments)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.appointments.patientId))
    .innerJoin(schema.users, eq(schema.users.id, schema.patients.userId))
    .where(eq(schema.appointments.id, appointmentId));

  if (!apptRes.length) {
    throw new ApiError(404, "Appointment not found", [], "NOT_FOUND");
  }

  const appt = apptRes[0];

  if (appt.patient_user_id !== patientUserId) {
    throw new ApiError(403, "You can only review your own appointments", [], "FORBIDDEN");
  }

  if (appt.status !== "COMPLETED") {
    throw new ApiError(400, "You can only review completed consultations", [], "INVALID_STATUS");
  }

  const targetDoctorId = appt.doctorId;

  // 2. Transaction: Insert Review and atomically update Doctor rating
  await db.transaction(async (tx) => {
    const dupCheck = await tx
      .select({ id: schema.reviews.id })
      .from(schema.reviews)
      .where(eq(schema.reviews.appointmentId, appointmentId));

    if (dupCheck.length) {
      throw new ApiError(409, "You have already reviewed this appointment", [], "DUPLICATE_REVIEW");
    }

    await tx.insert(schema.reviews).values({
      appointmentId,
      patientId: appt.patientId,
      doctorId: targetDoctorId,
      rating: ratingNum,
      comment,
      isAnonymous: Boolean(isAnonymous),
      isApproved: true,
    });

    // Atomically recalculate doctor average rating and review count
    const aggRes = await tx
      .select({
        count: sql`COUNT(*)::int`,
        avg: sql`COALESCE(AVG(${schema.reviews.rating}), 0)::numeric`,
      })
      .from(schema.reviews)
      .where(and(eq(schema.reviews.doctorId, targetDoctorId), eq(schema.reviews.isApproved, true)));

    const newCount = aggRes[0]?.count || 0;
    const newAvg = parseFloat(aggRes[0]?.avg || 0);

    await tx
      .update(schema.doctors)
      .set({
        avgRating: sql`ROUND(${newAvg}::numeric, 2)`,
        totalReviews: newCount,
        updatedAt: sql`NOW()`,
      })
      .where(eq(schema.doctors.id, targetDoctorId));
  });
};

// Get Reviews for Doctor (Public)
export const getDoctorReviews = async ({ doctorId }) => {
  const reviewsRes = await db
    .select({
      id: schema.reviews.id,
      rating: schema.reviews.rating,
      comment: schema.reviews.comment,
      created_at: schema.reviews.createdAt,
      is_anonymous: schema.reviews.isAnonymous,
      userName: sql`CASE WHEN ${schema.reviews.isAnonymous} THEN 'Anonymous Patient' ELSE ${schema.users.name} END`,
      is_approved: schema.reviews.isApproved,
    })
    .from(schema.reviews)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.reviews.patientId))
    .innerJoin(schema.users, eq(schema.users.id, schema.patients.userId))
    .where(and(eq(schema.reviews.doctorId, doctorId), eq(schema.reviews.isApproved, true)))
    .orderBy(desc(schema.reviews.createdAt));

  return { reviews: reviewsRes };
};

// Get All Reviews (Admin Panel)
export const getAllReviews = async () => {
  const reviewsRes = await db
    .select({
      id: schema.reviews.id,
      rating: schema.reviews.rating,
      comment: schema.reviews.comment,
      is_approved: schema.reviews.isApproved,
      created_at: schema.reviews.createdAt,
      userName: sql`pu.name`,
      doctorName: sql`du.name`,
      doctorSpeciality: schema.specializations.name,
    })
    .from(schema.reviews)
    .innerJoin(schema.patients, eq(schema.patients.id, schema.reviews.patientId))
    .innerJoin(sql`users pu`, sql`pu.id = ${schema.patients.userId}`)
    .innerJoin(schema.doctors, eq(schema.doctors.id, schema.reviews.doctorId))
    .innerJoin(sql`users du`, sql`du.id = ${schema.doctors.userId}`)
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .orderBy(desc(schema.reviews.createdAt));

  return { reviews: reviewsRes };
};

// Admin Toggle Review Approval
export const toggleReviewApproval = async ({ reviewId }) => {
  const result = await db
    .update(schema.reviews)
    .set({
      isApproved: sql`NOT ${schema.reviews.isApproved}`,
    })
    .where(eq(schema.reviews.id, reviewId))
    .returning();

  if (!result.length) {
    throw new ApiError(404, "Review not found", [], "NOT_FOUND");
  }

  const review = result[0];

  // Recalculate doctor rating
  const aggRes = await db
    .select({
      count: sql`COUNT(*)::int`,
      avg: sql`COALESCE(AVG(${schema.reviews.rating}), 0)::numeric`,
    })
    .from(schema.reviews)
    .where(and(eq(schema.reviews.doctorId, review.doctorId), eq(schema.reviews.isApproved, true)));

  const newCount = aggRes[0]?.count || 0;
  const newAvg = parseFloat(aggRes[0]?.avg || 0);

  await db
    .update(schema.doctors)
    .set({
      avgRating: sql`ROUND(${newAvg}::numeric, 2)`,
      totalReviews: newCount,
      updatedAt: sql`NOW()`,
    })
    .where(eq(schema.doctors.id, review.doctorId));

  return { isApproved: review.isApproved };
};

export default {
  submitReview,
  getDoctorReviews,
  getAllReviews,
  toggleReviewApproval,
};
