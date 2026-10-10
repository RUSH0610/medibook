# AI Symptom Triage & Healthcare Navigation Architecture

## 1. Architectural Philosophy
In MediBook, Artificial Intelligence is intentionally constrained to **symptom-to-specialty triage** and clinical navigation.
- **The AI is NOT a diagnosis engine**: It does not prescribe medications, diagnose pathological illnesses, or replace licensed physicians.
- **Zero Hallucination of Healthcare Providers**: The Large Language Model (Groq Cloud) is strictly prohibited from inventing doctor names, locations, ratings, or appointment time slots.
- **Relational Grounding**: The LLM outputs structured triage metadata (extracted symptoms, suggested medical specialty, urgency category, and rationale). The backend then takes the verified specialty string and queries PostgreSQL for actual, verified, currently available doctors.

---

## 2. Integrated Healthcare Navigation Workflow

```
Patient describes symptoms in natural language
                  │
                  ▼
          [Express REST API]
                  │
                  ▼
       [AI Symptom Triage Service]
   (Prompt Version: SYMPTOM_TRIAGE_V1)
                  │
                  ├── Calls Groq API with temperature 0.2
                  │   & strict JSON instruction
                  │
                  ▼
        [Schema Validation Layer]
   (Parses & verifies structured JSON output)
   - Extracted symptoms array
   - Suggested specialty (mapped to DB specializations)
   - Urgency category (routine / urgent / emergency)
   - Disclaimer & clinical guidance
                  │
                  ▼
       [PostgreSQL Database Query]
   - Filters approved doctors by specialization_id
   - Computes dynamic availability slots for upcoming dates
                  │
                  ▼
   Standardized JSON response to Patient UI
   - Triage summary + matched doctors + booking slots
```

---

## 3. Prompt Engineering & Versioning

Prompts are isolated into dedicated modules (`backend/src/services/ai/prompts/symptomTriage.prompt.js`) rather than embedded inside controllers.

### Current Version: `SYMPTOM_TRIAGE_V1`
```javascript
export const SYMPTOM_TRIAGE_V1 = {
  version: "1.0.0",
  systemPrompt: `You are an intelligent clinical triage assistant for a healthcare platform.
Your purpose is to analyze patient symptom descriptions and guide them to the appropriate medical specialist.
You do NOT diagnose illnesses. You provide informational guidance.

Available Medical Specialties:
{SPECIALTY_LIST}

You must respond ONLY with a valid, parseable JSON object matching this exact schema:
{
  "symptoms": ["string"],
  "suggestedSpecialty": "one of the available specialties",
  "urgency": "routine" | "urgent" | "emergency",
  "reason": "clear 2-sentence explanation of why this specialty matches the symptoms",
  "disclaimer": "This is informational triage guidance and does not constitute a formal medical diagnosis."
}
Do NOT include markdown backticks or commentary outside the JSON.`,
};
```

---

## 4. Robust Error Handling & Fallbacks

1. **Schema Validation**: Every response from the LLM is cleaned of code fences, parsed, and validated against the expected schema.
2. **Specialty Normalization**: The returned specialty is matched against the `specializations` table in PostgreSQL. If the LLM returns a slight variation (e.g., "Cardiology" instead of "Cardiologist"), a fuzzy matcher normalizes it.
3. **Resilience & Graceful Degradation**:
   - If Groq API experiences rate limits, network timeouts (>5s), or invalid output:
   - The backend catches the failure, logs the incident, and returns:
     ```json
     {
       "success": false,
       "errorCode": "AI_SERVICE_UNAVAILABLE",
       "message": "Unable to process symptoms right now. Please browse doctors by specialty manually."
     }
     ```
   - The core appointment and healthcare platform continues functioning with 100% availability.
