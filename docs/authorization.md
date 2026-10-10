# Authorization & Resource-Level Access Control (RLAC)

## 1. Overview
In healthcare applications, **Role-Based Access Control (RBAC)** alone is insufficient. A valid `PATIENT` role token must never allow a user to read another patient's blood test or prescription simply by changing an ID in the URL (Insecure Direct Object Reference - IDOR).

MediBook implements a dual-layer security model:
1. **Layer 1: Role-Level Authorization (RBAC)** - Restricts routes according to broad operational categories (`PATIENT`, `DOCTOR`, `ADMIN`).
2. **Layer 2: Resource-Level Authorization (RLAC)** - Verifies explicit data ownership or authorized clinical relationship before returning sensitive healthcare records.

---

## 2. Role Permissions Matrix

| Resource / Action | PATIENT | DOCTOR | ADMIN |
|---|:---:|:---:|:---:|
| Browse Approved Doctors | ✅ | ✅ | ✅ |
| Book Appointment | ✅ (Own) | ❌ | ❌ |
| Cancel Appointment | ✅ (Own) | ✅ (Assigned) | ✅ (Any) |
| Reschedule Appointment | ✅ (Own) | ❌ | ❌ |
| Issue Prescription | ❌ | ✅ (Assigned Appointment) | ❌ |
| View Prescription | ✅ (Own) | ✅ (Prescribed by self) | ✅ |
| Upload Medical Record | ✅ (Own) | ❌ | ❌ |
| View Medical Record | ✅ (Own) | ✅ (Explicitly Shared) | ❌ (PHI Privacy) |
| Submit Review | ✅ (After Completed Visit) | ❌ | ❌ |
| Approve/Hide Review | ❌ | ❌ | ✅ |
| Manage System Users | ❌ | ❌ | ✅ |
| Approve Doctor Profile | ❌ | ❌ | ✅ |

---

## 3. Resource-Level Authorization Middleware & Helpers

### 3.1 Medical Records Access Enforcement
When requesting `GET /api/v1/medical-records/:id`, the authorization layer performs the following relational verification:

```javascript
export const authorizeMedicalRecordAccess = async (req, res, next) => {
  const { id } = req.params;
  const user = req.user; // populated by authenticateToken

  const recordRes = await query(
    `SELECT mr.*, p.user_id as patient_user_id 
     FROM medical_records mr
     JOIN patients p ON p.id = mr.patient_id
     WHERE mr.id = $1`,
    [id]
  );

  if (!recordRes.rows.length) {
    throw new ApiError(404, "Medical record not found");
  }

  const record = recordRes.rows[0];

  // 1. Patient Access: must be the patient who owns the record
  if (user.role === "PATIENT" && record.patient_user_id === user.id) {
    req.record = record;
    return next();
  }

  // 2. Doctor Access: must be in shared_with_doctors list OR doctor of the appointment
  if (user.role === "DOCTOR") {
    const docRes = await query(`SELECT id FROM doctors WHERE user_id = $1`, [user.id]);
    if (docRes.rows.length) {
      const doctorId = docRes.rows[0].id;
      const isShared = record.shared_with_doctors && record.shared_with_doctors.includes(doctorId);
      const isDirectDoc = record.doctor_id === doctorId;
      if (isShared || isDirectDoc) {
        req.record = record;
        return next();
      }
    }
  }

  // Otherwise, strictly forbid access
  throw new ApiError(403, "Access denied: You do not have permission to view this medical record");
};
```

### 3.2 Prescription Access Enforcement
`GET /api/v1/prescriptions/:id` enforces that only:
1. The patient to whom the prescription was issued (`patient.user_id === req.user.id`), OR
2. The prescribing doctor (`doctor.user_id === req.user.id`), OR
3. An authorized administrator
can view the clinical prescription.
