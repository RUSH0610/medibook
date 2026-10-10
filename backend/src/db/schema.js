import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  date,
  time,
  integer,
  numeric,
  jsonb,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// 1. Users Table (PATIENT, DOCTOR, ADMIN)
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 50 }).notNull(),
    phone: varchar("phone", { length: 50 }).default(""),
    avatarUrl: text("avatar_url").default(""),
    isActive: boolean("is_active").notNull().default(true),
    isVerified: boolean("is_verified").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_role").on(table.role),
  ]
);

// 2. Specializations Table
export const specializations = pgTable(
  "specializations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    description: text("description").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_specializations_name").on(table.name),
  ]
);

// 3. Patients Table (1:1 with users where role='PATIENT')
export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    dateOfBirth: date("date_of_birth"),
    gender: varchar("gender", { length: 50 }).default("Not Selected"),
    bloodGroup: varchar("blood_group", { length: 10 }).default(""),
    insuranceProvider: varchar("insurance_provider", { length: 255 }).default(""),
    insurancePolicyNo: varchar("insurance_policy_no", { length: 255 }).default(""),
    emergencyContactName: varchar("emergency_contact_name", { length: 255 }).default(""),
    emergencyContactPhone: varchar("emergency_contact_phone", { length: 50 }).default(""),
    emergencyContactRelation: varchar("emergency_contact_relation", { length: 100 }).default(""),
    allergies: text("allergies").array().default(sql`ARRAY[]::TEXT[]`),
    chronicConditions: text("chronic_conditions").array().default(sql`ARRAY[]::TEXT[]`),
    currentMedications: text("current_medications").array().default(sql`ARRAY[]::TEXT[]`),
    pastSurgeries: text("past_surgeries").array().default(sql`ARRAY[]::TEXT[]`),
    address: jsonb("address").default({ line1: "", line2: "" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_patients_user_id").on(table.userId),
  ]
);

// 4. Doctors Table (1:1 with users where role='DOCTOR')
export const doctors = pgTable(
  "doctors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    specializationId: uuid("specialization_id")
      .notNull()
      .references(() => specializations.id, { onDelete: "restrict" }),
    qualification: varchar("qualification", { length: 255 }).notNull(),
    experienceYears: integer("experience_years").notNull().default(0),
    bio: text("bio").notNull(),
    consultationFee: numeric("consultation_fee", { precision: 10, scale: 2 }).notNull().default("0.00"),
    licenseNumber: varchar("license_number", { length: 100 }).default(""),
    isApproved: boolean("is_approved").notNull().default(true),
    isAvailable: boolean("is_available").notNull().default(true),
    hospitalAffiliation: varchar("hospital_affiliation", { length: 255 }).default(""),
    consultationRoom: varchar("consultation_room", { length: 100 }).default(""),
    address: jsonb("address").default({ line1: "", line2: "" }),
    avgRating: numeric("avg_rating", { precision: 3, scale: 2 }).notNull().default("0.00"),
    totalReviews: integer("total_reviews").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_doctors_specialization_id").on(table.specializationId),
    index("idx_doctors_is_approved").on(table.isApproved),
    index("idx_doctors_user_id").on(table.userId),
  ]
);

// 5. Doctor Recurring Weekly Availability
export const doctorAvailability = pgTable(
  "doctor_availability",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    dayOfWeek: varchar("day_of_week", { length: 15 }).notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    slotDurationMinutes: integer("slot_duration_minutes").notNull().default(30),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_doctor_availability_lookup").on(table.doctorId, table.dayOfWeek),
    uniqueIndex("uq_doctor_availability_day").on(table.doctorId, table.dayOfWeek),
  ]
);

// 6. Doctor Leave Blocks (time-off/holidays)
export const doctorLeaveBlocks = pgTable(
  "doctor_leave_blocks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    leaveDate: date("leave_date").notNull(),
    isFullDay: boolean("is_full_day").notNull().default(true),
    startTime: time("start_time"),
    endTime: time("end_time"),
    reason: text("reason").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_doctor_leave_date").on(table.doctorId, table.leaveDate),
  ]
);

// 7. Appointments Table
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    appointmentDate: date("appointment_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    appointmentType: varchar("appointment_type", { length: 50 }).notNull().default("in-person"),
    status: varchar("status", { length: 50 }).notNull().default("CONFIRMED"),
    reason: text("reason").default(""),
    notes: text("notes").default(""),
    patientPhone: varchar("patient_phone", { length: 50 }).default(""),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_appointments_doc_date").on(table.doctorId, table.appointmentDate),
    index("idx_appointments_patient_date").on(table.patientId, table.appointmentDate),
    index("idx_appointments_status").on(table.status),
    index("idx_appointments_date").on(table.appointmentDate),
    uniqueIndex("uq_active_doctor_slot")
      .on(table.doctorId, table.appointmentDate, table.startTime)
      .where(sql`status <> 'CANCELLED'`),
    check("chk_appointment_end_time", sql`end_time > start_time`),
    check("chk_appointment_status", sql`status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')`),
    check("chk_appointment_type", sql`appointment_type IN ('in-person', 'video', 'phone')`),
  ]
);

// 8. Prescriptions Table
export const prescriptions = pgTable(
  "prescriptions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .unique()
      .references(() => appointments.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    diagnosis: text("diagnosis").notNull(),
    labTests: text("lab_tests").array().default(sql`ARRAY[]::TEXT[]`),
    advice: text("advice").default(""),
    followUpDate: date("follow_up_date"),
    nextVisitIn: varchar("next_visit_in", { length: 100 }).default(""),
    isSigned: boolean("is_signed").notNull().default(true),
    notes: text("notes").default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_prescriptions_patient").on(table.patientId),
    index("idx_prescriptions_doctor").on(table.doctorId),
  ]
);

// 9. Prescription Items Table (Normalized Medicine details)
export const prescriptionItems = pgTable(
  "prescription_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    prescriptionId: uuid("prescription_id")
      .notNull()
      .references(() => prescriptions.id, { onDelete: "cascade" }),
    medicineName: varchar("medicine_name", { length: 255 }).notNull(),
    dosage: varchar("dosage", { length: 100 }).notNull(),
    frequency: varchar("frequency", { length: 100 }).notNull(),
    duration: varchar("duration", { length: 100 }).notNull(),
    instructions: text("instructions").default(""),
    quantity: integer("quantity").default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_prescription_items_prescription_id").on(table.prescriptionId),
  ]
);

// 10. Medical Records Table
export const medicalRecords = pgTable(
  "medical_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id").references(() => doctors.id, { onDelete: "set null" }),
    appointmentId: uuid("appointment_id").references(() => appointments.id, { onDelete: "set null" }),
    recordType: varchar("record_type", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").default(""),
    fileUrl: text("file_url").notNull(),
    fileType: varchar("file_type", { length: 50 }).default("image"),
    cloudinaryPublicId: varchar("cloudinary_public_id", { length: 255 }).default(""),
    isSharedWithDoctor: boolean("is_shared_with_doctor").notNull().default(false),
    sharedWithDoctors: uuid("shared_with_doctors").array().default(sql`ARRAY[]::UUID[]`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_medical_records_patient").on(table.patientId),
    index("idx_medical_records_appointment").on(table.appointmentId),
  ]
);

// 11. Reviews Table
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    appointmentId: uuid("appointment_id")
      .notNull()
      .unique()
      .references(() => appointments.id, { onDelete: "cascade" }),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id, { onDelete: "cascade" }),
    doctorId: uuid("doctor_id")
      .notNull()
      .references(() => doctors.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    comment: text("comment").default(""),
    isApproved: boolean("is_approved").notNull().default(true),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_reviews_doctor").on(table.doctorId),
    check("chk_review_rating", sql`rating >= 1 AND rating <= 5`),
  ]
);

// 12. Notifications Table
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    relatedId: uuid("related_id"),
    link: varchar("link", { length: 255 }).default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_notifications_user_read").on(table.userId, table.isRead),
  ]
);

// 13. Refresh Tokens Table
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    isRevoked: boolean("is_revoked").notNull().default(false),
    replacedByToken: varchar("replaced_by_token", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_refresh_tokens_user").on(table.userId),
    index("idx_refresh_tokens_hash").on(table.tokenHash),
  ]
);

// 14. OTPs Table
export const otps = pgTable(
  "otps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    email: varchar("email", { length: 255 }).notNull(),
    otpCode: varchar("otp_code", { length: 10 }).notNull(),
    purpose: varchar("purpose", { length: 50 }).notNull().default("REGISTRATION"),
    payload: jsonb("payload").default({}),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_otps_email_purpose").on(table.email, table.purpose),
  ]
);

// ==========================================
// RELATIONS DEFINITIONS (Drizzle Relational Queries)
// ==========================================

export const usersRelations = relations(users, ({ one, many }) => ({
  patient: one(patients, {
    fields: [users.id],
    references: [patients.userId],
  }),
  doctor: one(doctors, {
    fields: [users.id],
    references: [doctors.userId],
  }),
  notifications: many(notifications),
  refreshTokens: many(refreshTokens),
}));

export const specializationsRelations = relations(specializations, ({ many }) => ({
  doctors: many(doctors),
}));

export const patientsRelations = relations(patients, ({ one, many }) => ({
  user: one(users, {
    fields: [patients.userId],
    references: [users.id],
  }),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  medicalRecords: many(medicalRecords),
  reviews: many(reviews),
}));

export const doctorsRelations = relations(doctors, ({ one, many }) => ({
  user: one(users, {
    fields: [doctors.userId],
    references: [users.id],
  }),
  specialization: one(specializations, {
    fields: [doctors.specializationId],
    references: [specializations.id],
  }),
  availability: many(doctorAvailability),
  leaveBlocks: many(doctorLeaveBlocks),
  appointments: many(appointments),
  prescriptions: many(prescriptions),
  reviews: many(reviews),
  medicalRecords: many(medicalRecords),
}));

export const doctorAvailabilityRelations = relations(doctorAvailability, ({ one }) => ({
  doctor: one(doctors, {
    fields: [doctorAvailability.doctorId],
    references: [doctors.id],
  }),
}));

export const doctorLeaveBlocksRelations = relations(doctorLeaveBlocks, ({ one }) => ({
  doctor: one(doctors, {
    fields: [doctorLeaveBlocks.doctorId],
    references: [doctors.id],
  }),
}));

export const appointmentsRelations = relations(appointments, ({ one }) => ({
  patient: one(patients, {
    fields: [appointments.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [appointments.doctorId],
    references: [doctors.id],
  }),
  prescription: one(prescriptions, {
    fields: [appointments.id],
    references: [prescriptions.appointmentId],
  }),
  review: one(reviews, {
    fields: [appointments.id],
    references: [reviews.appointmentId],
  }),
}));

export const prescriptionsRelations = relations(prescriptions, ({ one, many }) => ({
  appointment: one(appointments, {
    fields: [prescriptions.appointmentId],
    references: [appointments.id],
  }),
  doctor: one(doctors, {
    fields: [prescriptions.doctorId],
    references: [doctors.id],
  }),
  patient: one(patients, {
    fields: [prescriptions.patientId],
    references: [patients.id],
  }),
  items: many(prescriptionItems),
}));

export const prescriptionItemsRelations = relations(prescriptionItems, ({ one }) => ({
  prescription: one(prescriptions, {
    fields: [prescriptionItems.prescriptionId],
    references: [prescriptions.id],
  }),
}));

export const medicalRecordsRelations = relations(medicalRecords, ({ one }) => ({
  patient: one(patients, {
    fields: [medicalRecords.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [medicalRecords.doctorId],
    references: [doctors.id],
  }),
  appointment: one(appointments, {
    fields: [medicalRecords.appointmentId],
    references: [appointments.id],
  }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  appointment: one(appointments, {
    fields: [reviews.appointmentId],
    references: [appointments.id],
  }),
  patient: one(patients, {
    fields: [reviews.patientId],
    references: [patients.id],
  }),
  doctor: one(doctors, {
    fields: [reviews.doctorId],
    references: [doctors.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.userId],
    references: [users.id],
  }),
}));
