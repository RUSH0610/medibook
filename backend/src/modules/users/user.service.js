import { db, schema } from "../../db/index.js";
import { eq, sql } from "drizzle-orm";
import { uploadBuffer } from "../../utils/cloudinaryUpload.js";
import ApiError from "../../utils/ApiError.js";

// Get User & Patient Profile
export const getProfile = async ({ userId }) => {
  const userRes = await db
    .select({
      id: schema.users.id,
      name: schema.users.name,
      email: schema.users.email,
      phone: schema.users.phone,
      image: schema.users.avatarUrl,
      role: schema.users.role,
      dob: schema.patients.dateOfBirth,
      gender: schema.patients.gender,
      bloodGroup: schema.patients.bloodGroup,
      insuranceProvider: schema.patients.insuranceProvider,
      insurancePolicyNo: schema.patients.insurancePolicyNo,
      emergency_contact_name: schema.patients.emergencyContactName,
      emergency_contact_phone: schema.patients.emergencyContactPhone,
      emergency_contact_relation: schema.patients.emergencyContactRelation,
      allergies: schema.patients.allergies,
      chronicConditions: schema.patients.chronicConditions,
      currentMedications: schema.patients.currentMedications,
      pastSurgeries: schema.patients.pastSurgeries,
      address: schema.patients.address,
      emergencyContact: sql`json_build_object(
        'name', ${schema.patients.emergencyContactName},
        'phone', ${schema.patients.emergencyContactPhone},
        'relation', ${schema.patients.emergencyContactRelation}
      )`,
    })
    .from(schema.users)
    .leftJoin(schema.patients, eq(schema.patients.userId, schema.users.id))
    .where(eq(schema.users.id, userId));

  if (!userRes.length) {
    throw new ApiError(404, "User profile not found", [], "USER_NOT_FOUND");
  }

  return { user: userRes[0] };
};

// Update User & Patient Profile
export const updateProfile = async ({
  userId,
  name,
  phone,
  address,
  dob,
  gender,
  bloodGroup,
  insuranceProvider,
  insurancePolicyNo,
  emergencyContact,
  imageFile,
}) => {
  let imageUrl = null;
  if (imageFile) {
    const uploadRes = await uploadBuffer(imageFile.buffer, {
      folder: "medibook/avatars",
      resource_type: "image",
    });
    imageUrl = uploadRes.secure_url;
  }

  await db.transaction(async (tx) => {
    // 1. Update User Table
    const userUpdates = {
      updatedAt: sql`NOW()`,
    };
    let hasUserUpdates = false;

    if (name) {
      userUpdates.name = name;
      hasUserUpdates = true;
    }
    if (phone !== undefined) {
      userUpdates.phone = phone;
      hasUserUpdates = true;
    }
    if (imageUrl) {
      userUpdates.avatarUrl = imageUrl;
      hasUserUpdates = true;
    }

    if (hasUserUpdates) {
      await tx
        .update(schema.users)
        .set(userUpdates)
        .where(eq(schema.users.id, userId));
    }

    // 2. Ensure patient record exists
    await tx
      .insert(schema.patients)
      .values({ userId })
      .onConflictDoNothing({ target: schema.patients.userId });

    // 3. Update Patient Table
    const patientUpdates = {
      updatedAt: sql`NOW()`,
    };
    let hasPatientUpdates = false;

    if (dob) {
      patientUpdates.dateOfBirth = dob;
      hasPatientUpdates = true;
    }
    if (gender) {
      patientUpdates.gender = gender;
      hasPatientUpdates = true;
    }
    if (bloodGroup !== undefined) {
      patientUpdates.bloodGroup = bloodGroup;
      hasPatientUpdates = true;
    }
    if (insuranceProvider !== undefined) {
      patientUpdates.insuranceProvider = insuranceProvider;
      hasPatientUpdates = true;
    }
    if (insurancePolicyNo !== undefined) {
      patientUpdates.insurancePolicyNo = insurancePolicyNo;
      hasPatientUpdates = true;
    }
    if (address !== undefined) {
      patientUpdates.address = typeof address === "string" ? JSON.parse(address) : address;
      hasPatientUpdates = true;
    }

    let ec = emergencyContact;
    if (typeof ec === "string") {
      try { ec = JSON.parse(ec); } catch {}
    }
    if (ec && typeof ec === "object") {
      if (ec.name) {
        patientUpdates.emergencyContactName = ec.name;
        hasPatientUpdates = true;
      }
      if (ec.phone) {
        patientUpdates.emergencyContactPhone = ec.phone;
        hasPatientUpdates = true;
      }
      if (ec.relation) {
        patientUpdates.emergencyContactRelation = ec.relation;
        hasPatientUpdates = true;
      }
    }

    if (hasPatientUpdates) {
      await tx
        .update(schema.patients)
        .set(patientUpdates)
        .where(eq(schema.patients.userId, userId));
    }
  });
};

export default {
  getProfile,
  updateProfile,
};
