import axios from "axios";
import { db, schema } from "../../db/index.js";
import { eq, and, desc } from "drizzle-orm";
import { PROMPT_VERSION, buildTriagePrompt } from "./prompts/symptomTriage.prompt.js";
import { validateTriageOutput } from "./schemas/symptomTriage.schema.js";
import ApiError from "../../utils/ApiError.js";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// Clean LLM response string to extract pure JSON
const extractJsonString = (raw) => {
  if (!raw) return "";
  let clean = raw.trim();
  if (clean.startsWith("```json")) {
    clean = clean.substring(7);
  } else if (clean.startsWith("```")) {
    clean = clean.substring(3);
  }
  if (clean.endsWith("```")) {
    clean = clean.substring(0, clean.length - 3);
  }
  return clean.trim();
};

// Execute AI symptom triage and query PostgreSQL for actual matching doctors
// @param {string} symptomsText - Natural language patient symptom description
// @returns {Promise<Object>} Triage analysis and real database doctors
export const runSymptomTriage = async (symptomsText) => {
  // 1. Fetch available specialties from PostgreSQL via Drizzle
  const specRes = await db
    .select({ id: schema.specializations.id, name: schema.specializations.name })
    .from(schema.specializations)
    .orderBy(schema.specializations.name);
  const availableSpecialties = specRes.map((r) => r.name);

  if (!availableSpecialties.length) {
    throw new ApiError(500, "No medical specialties configured in platform");
  }

  const prompt = buildTriagePrompt(availableSpecialties, symptomsText);

  let triageData;
  try {
    const groqResponse = await axios.post(
      GROQ_API_URL,
      {
        model: GROQ_MODEL,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 450,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 8000,
      }
    );

    const rawContent = groqResponse.data?.choices?.[0]?.message?.content;
    const jsonString = extractJsonString(rawContent);
    const parsed = JSON.parse(jsonString);

    const validation = validateTriageOutput(parsed, availableSpecialties);
    if (!validation.valid) {
      throw new Error(`Schema validation failed: ${validation.error}`);
    }

    triageData = validation.data;
  } catch (err) {
    console.warn("[SymptomTriageService] LLM call failed, using rule-based triage fallback:", err.message);
    triageData = fallbackRuleTriage(symptomsText, availableSpecialties);
  }

  // 2. Query PostgreSQL for REAL matching approved doctors via Drizzle (LLM never invents doctors)
  const doctorSelectFields = {
    id: schema.doctors.id,
    user_id: schema.doctors.userId,
    name: schema.users.name,
    email: schema.users.email,
    image: schema.users.avatarUrl,
    speciality: schema.specializations.name,
    degree: schema.doctors.qualification,
    experience: schema.doctors.experienceYears,
    about: schema.doctors.bio,
    fees: schema.doctors.consultationFee,
    hospital_affiliation: schema.doctors.hospitalAffiliation,
    consultation_room: schema.doctors.consultationRoom,
    address: schema.doctors.address,
    avg_rating: schema.doctors.avgRating,
    total_reviews: schema.doctors.totalReviews,
    is_available: schema.doctors.isAvailable,
  };

  let matchedDoctors = await db
    .select(doctorSelectFields)
    .from(schema.doctors)
    .innerJoin(schema.users, eq(schema.users.id, schema.doctors.userId))
    .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
    .where(
      and(
        eq(schema.specializations.name, triageData.suggestedSpecialty),
        eq(schema.doctors.isApproved, true),
        eq(schema.users.isActive, true)
      )
    )
    .orderBy(desc(schema.doctors.avgRating), desc(schema.doctors.experienceYears))
    .limit(5);

  // If no doctors found in specific specialty, fallback to any active approved doctor
  if (!matchedDoctors.length) {
    matchedDoctors = await db
      .select(doctorSelectFields)
      .from(schema.doctors)
      .innerJoin(schema.users, eq(schema.users.id, schema.doctors.userId))
      .innerJoin(schema.specializations, eq(schema.specializations.id, schema.doctors.specializationId))
      .where(
        and(
          eq(schema.doctors.isApproved, true),
          eq(schema.users.isActive, true)
        )
      )
      .orderBy(desc(schema.doctors.avgRating), desc(schema.doctors.experienceYears))
      .limit(5);
  }

  return {
    promptVersion: PROMPT_VERSION,
    symptoms: triageData.symptoms,
    suggestedSpecialty: triageData.suggestedSpecialty,
    speciality: triageData.suggestedSpecialty, // backward compatibility with legacy frontend
    urgency: triageData.urgency,
    reason: triageData.reason,
    urgency_reason: triageData.reason, // backward compatibility
    disclaimer: triageData.disclaimer,
    matchedDoctors,
  };
};

const fallbackRuleTriage = (symptomsText, availableSpecialties) => {
  const text = symptomsText.toLowerCase();

  let suggestedSpecialty = "General physician";
  let urgency = "routine";
  let reason = "Specialty matched based on reported symptoms.";

  if (text.includes("heart") || text.includes("chest") || text.includes("cardio") || text.includes("palpitation") || text.includes("pulse")) {
    suggestedSpecialty = "Cardiologist";
    urgency = (text.includes("pain") || text.includes("speed") || text.includes("high") || text.includes("severe") || text.includes("breath")) ? "emergency" : "urgent";
    reason = "Symptoms such as chest discomfort, palpitations, or rapid heart rate suggest urgent cardiology evaluation.";
  } else if (text.includes("skin") || text.includes("rash") || text.includes("acne") || text.includes("itching") || text.includes("eczema") || text.includes("spot")) {
    suggestedSpecialty = "Dermatologist";
    urgency = "routine";
    reason = "Dermatology specialty is recommended for skin, hair, and nail concerns.";
  } else if (text.includes("headache") || text.includes("brain") || text.includes("dizzy") || text.includes("seizure") || text.includes("numb") || text.includes("migraine")) {
    suggestedSpecialty = "Neurologist";
    urgency = (text.includes("severe") || text.includes("faint")) ? "urgent" : "routine";
    reason = "Neurological evaluation is advised for recurring headaches, dizziness, or neurological symptoms.";
  } else if (text.includes("stomach") || text.includes("gut") || text.includes("acid") || text.includes("vomit") || text.includes("digest") || text.includes("nausea")) {
    suggestedSpecialty = "Gastroenterologist";
    urgency = "routine";
    reason = "Gastroenterologist consultation recommended for digestive or abdominal symptoms.";
  } else if (text.includes("bone") || text.includes("joint") || text.includes("fracture") || text.includes("knee") || text.includes("back") || text.includes("spine")) {
    suggestedSpecialty = "Orthopedic";
    urgency = (text.includes("fracture") || text.includes("broken")) ? "urgent" : "routine";
    reason = "Orthopedic evaluation is suggested for joint, bone, or musculoskeletal pain.";
  } else if (text.includes("child") || text.includes("baby") || text.includes("infant") || text.includes("pediatric")) {
    suggestedSpecialty = "Pediatricians";
    urgency = "routine";
    reason = "Pediatric specialty recommended for infants and children.";
  } else if (text.includes("pregnancy") || text.includes("period") || text.includes("female") || text.includes("gyne")) {
    suggestedSpecialty = "Gynecologist";
    urgency = "routine";
    reason = "Gynecology consultation advised for women's reproductive health.";
  }

  const matched = availableSpecialties.find(
    (s) => s.toLowerCase() === suggestedSpecialty.toLowerCase()
  );

  return {
    symptoms: [symptomsText],
    suggestedSpecialty: matched || availableSpecialties[0] || "General physician",
    urgency,
    reason,
    disclaimer: "This is automated medical symptom navigation guidance. For life-threatening emergencies, please contact emergency medical services immediately."
  };
};

export default {
  runSymptomTriage,
};
