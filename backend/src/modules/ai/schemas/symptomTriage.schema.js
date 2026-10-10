// Schema Validation for LLM Symptom Triage Output

export const validateTriageOutput = (data, validSpecialties) => {
  if (!data || typeof data !== "object") {
    return { valid: false, error: "Output must be a JSON object" };
  }

  // 1. Symptoms array
  if (!Array.isArray(data.symptoms) || data.symptoms.length === 0) {
    return { valid: false, error: "Missing or invalid 'symptoms' array" };
  }

  // 2. Suggested Specialty
  if (!data.suggestedSpecialty || typeof data.suggestedSpecialty !== "string") {
    return { valid: false, error: "Missing 'suggestedSpecialty' string" };
  }

  // 3. Urgency
  const validUrgency = ["routine", "urgent", "emergency", "low", "medium", "high"];
  const urgencyLower = String(data.urgency || "").toLowerCase();
  if (!validUrgency.includes(urgencyLower)) {
    data.urgency = "routine";
  } else if (urgencyLower === "low") {
    data.urgency = "routine";
  } else if (urgencyLower === "medium") {
    data.urgency = "urgent";
  } else if (urgencyLower === "high") {
    data.urgency = "emergency";
  }

  // 4. Rationale & Disclaimer
  if (!data.reason || typeof data.reason !== "string") {
    data.reason = "Specialty recommended based on matching clinical symptoms.";
  }

  if (!data.disclaimer || typeof data.disclaimer !== "string") {
    data.disclaimer = "This is informational guidance and not a medical diagnosis.";
  }

  // 5. Specialty Matching & Normalization against Database Specialties
  const matched = validSpecialties.find(
    (s) => s.toLowerCase() === data.suggestedSpecialty.trim().toLowerCase()
  );

  if (matched) {
    data.suggestedSpecialty = matched;
  } else {
    // Partial substring match fallback
    const partial = validSpecialties.find(
      (s) =>
        s.toLowerCase().includes(data.suggestedSpecialty.toLowerCase()) ||
        data.suggestedSpecialty.toLowerCase().includes(s.toLowerCase())
    );
    data.suggestedSpecialty = partial || validSpecialties[0] || "General physician";
  }

  return { valid: true, data };
};

export default {
  validateTriageOutput,
};
