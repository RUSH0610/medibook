import "dotenv/config";
import { pool } from "../src/db/index.js";

const BASE_URL = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 4000}/api/v1`;

const results = [];
let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function test(name, fn) {
  process.stdout.write(`• ${name}... `);
  try {
    await fn();
    console.log("✓ PASS");
    results.push({ name, status: "PASS" });
    passCount++;
  } catch (err) {
    console.log(`✗ FAIL: ${err.message}`);
    results.push({ name, status: "FAIL", error: err.message });
    failCount++;
  }
}

// Helper to make API requests with json bodies
async function apiRequest(path, { method = "GET", token = null, body = null, headers = {} } = {}) {
  const reqHeaders = {
    ...headers,
  };
  if (token) {
    reqHeaders["Authorization"] = `Bearer ${token}`;
  }
  let reqBody = body;
  if (body && !(body instanceof FormData) && typeof body === "object") {
    reqHeaders["Content-Type"] = "application/json";
    reqBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: reqHeaders,
    body: reqBody,
  });

  let data = null;
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, headers: res.headers, data };
}

// Flow state holders
let patientToken = null;
let patientUser = null;
let patientEmail = null;
let doctorToken = null;
let doctorUser = null;
let adminToken = null;
let adminUser = null;
let createdDoctorId = null;
let testAppointmentId = null;
let testPrescriptionId = null;
let testRecordId = null;

async function runAll() {
  console.log(`\n==============================================`);
  console.log(`MediBook End-to-End API Smoke Test`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`==============================================\n`);

  // 1. Patient register -> OTP -> 5 wrong guesses -> valid OTP -> verify -> login
  await test("Flow 1: Patient register -> OTP -> 5 wrong guesses (429) -> verify -> login", async () => {
    patientEmail = `smoke_patient_${Date.now()}@example.com`;
    const regRes = await apiRequest("/auth/register", {
      method: "POST",
      body: {
        name: "Smoke Patient",
        email: patientEmail,
        password: "Password123!",
      },
    });
    assert(regRes.status === 200, `Register failed with status ${regRes.status}: ${JSON.stringify(regRes.data)}`);

    // Fetch OTP code from database
    const otpQuery = await pool.query(
      `SELECT id, otp_code, attempts FROM otps WHERE email = $1 AND purpose = 'REGISTRATION' ORDER BY created_at DESC LIMIT 1`,
      [patientEmail]
    );
    assert(otpQuery.rows.length > 0, "No OTP found in database for registered email");
    const validOtp = otpQuery.rows[0].otp_code;

    // Check 5 wrong OTP guesses
    for (let i = 1; i <= 4; i++) {
      const wrongRes = await apiRequest("/auth/verify-otp", {
        method: "POST",
        body: { email: patientEmail, otp: "000000" },
      });
      assert(wrongRes.status === 400, `Expected 400 on wrong attempt ${i}, got ${wrongRes.status}`);
    }

    // 5th wrong guess must invalidate code and return 429
    const fifthWrongRes = await apiRequest("/auth/verify-otp", {
      method: "POST",
      body: { email: patientEmail, otp: "000000" },
    });
    assert(
      fifthWrongRes.status === 429,
      `Expected 429 on 5th wrong guess, got ${fifthWrongRes.status}: ${JSON.stringify(fifthWrongRes.data)}`
    );

    // Verify OTP record is deleted/invalidated
    const afterInvalidated = await pool.query(
      `SELECT * FROM otps WHERE email = $1 AND purpose = 'REGISTRATION'`,
      [patientEmail]
    );
    assert(afterInvalidated.rows.length === 0, "OTP was not invalidated from database after 5 wrong attempts");

    // Re-register to get fresh OTP for verification
    await apiRequest("/auth/register", {
      method: "POST",
      body: {
        name: "Smoke Patient",
        email: patientEmail,
        password: "Password123!",
      },
    });
    const freshOtpQuery = await pool.query(
      `SELECT otp_code FROM otps WHERE email = $1 AND purpose = 'REGISTRATION' ORDER BY created_at DESC LIMIT 1`,
      [patientEmail]
    );
    const freshOtp = freshOtpQuery.rows[0].otp_code;

    // Verify with fresh OTP
    const verifyRes = await apiRequest("/auth/verify-otp", {
      method: "POST",
      body: { email: patientEmail, otp: freshOtp },
    });
    assert(verifyRes.status === 201, `Verify OTP failed with status ${verifyRes.status}: ${JSON.stringify(verifyRes.data)}`);
    assert(verifyRes.data.data.accessToken, "No accessToken returned from verify-otp");

    // Login
    const loginRes = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: patientEmail, password: "Password123!" },
    });
    assert(loginRes.status === 200, `Login failed: ${loginRes.status}`);
    patientToken = loginRes.data.data.accessToken;
    patientUser = loginRes.data.data.user;
    assert(patientToken, "No patient token on login");
  });

  // 2. Doctor login, admin login, and role RBAC enforcement
  await test("Flow 2: Doctor login, Admin login, and RBAC role isolation (403)", async () => {
    // Doctor login (from demo seed)
    const docLoginRes = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: "richard.james@medibook.com", password: "doctor123456" },
    });
    assert(docLoginRes.status === 200, `Doctor login failed: ${docLoginRes.status}`);
    doctorToken = docLoginRes.data.data.accessToken;
    doctorUser = docLoginRes.data.data.user;

    // Admin login (from seed)
    const adminLoginRes = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: process.env.ADMIN_EMAIL || "admin@medibook.com", password: process.env.ADMIN_PASSWORD || "admin123456" },
    });
    assert(adminLoginRes.status === 200, `Admin login failed: ${adminLoginRes.status}`);
    adminToken = adminLoginRes.data.data.accessToken;
    adminUser = adminLoginRes.data.data.user;

    // Role test: Patient cannot access Admin routes -> 403
    const patOnAdmin = await apiRequest("/admin/dashboard", { token: patientToken });
    assert(patOnAdmin.status === 403, `Patient on admin route expected 403, got ${patOnAdmin.status}`);

    // Role test: Doctor cannot access Admin routes -> 403
    const docOnAdmin = await apiRequest("/admin/dashboard", { token: doctorToken });
    assert(docOnAdmin.status === 403, `Doctor on admin route expected 403, got ${docOnAdmin.status}`);

    // Role test: Doctor cannot access Patient-only booking route -> 403
    const docOnPatient = await apiRequest("/appointments/my", { token: doctorToken });
    assert(docOnPatient.status === 403, `Doctor on patient route expected 403, got ${docOnPatient.status}`);

    // Role test: Patient cannot access Doctor-only route -> 403
    const patOnDoc = await apiRequest("/doctors/me/analytics", { token: patientToken });
    assert(patOnDoc.status === 403, `Patient on doctor route expected 403, got ${patOnDoc.status}`);
  });

  // 3. Admin adds a doctor, approves, toggles availability, and lists users & appointments
  await test("Flow 3: Admin adds doctor, approves, toggles availability, lists users/appointments", async () => {
    const newDocEmail = `newdoc_${Date.now()}@medibook.com`;
    const addDocRes = await apiRequest("/admin/doctors", {
      method: "POST",
      token: adminToken,
      body: {
        name: "Dr. Smoke Test",
        email: newDocEmail,
        password: "DoctorPass123!",
        speciality: "General physician",
        degree: "MBBS, MD",
        experience: "4",
        about: "Experienced physician for smoke testing.",
        fees: "40.00",
        address: JSON.stringify({ line1: "123 Smoke Way", line2: "Suite 1" }),
        hospitalAffiliation: "General Hospital",
        consultationRoom: "Room 101",
      },
    });
    assert(addDocRes.status === 201, `Admin add doctor failed: ${addDocRes.status}: ${JSON.stringify(addDocRes.data)}`);

    // List doctors to find added doctor ID
    const docsRes = await apiRequest("/admin/doctors", { token: adminToken });
    assert(docsRes.status === 200, `Admin get doctors failed: ${docsRes.status}`);
    const foundDoc = docsRes.data.data.doctors.find((d) => d.email === newDocEmail);
    assert(foundDoc, "Newly added doctor not found in admin doctor list");
    createdDoctorId = foundDoc.id || foundDoc._id;

    // Toggle approval
    const approveRes = await apiRequest(`/admin/doctors/${createdDoctorId}/approval`, {
      method: "PUT",
      token: adminToken,
    });
    assert(approveRes.status === 200, `Toggle approval failed: ${approveRes.status}`);

    // Toggle availability
    const availRes = await apiRequest(`/admin/doctors/${createdDoctorId}/availability`, {
      method: "PUT",
      token: adminToken,
    });
    assert(availRes.status === 200, `Toggle availability failed: ${availRes.status}`);

    // List users
    const usersRes = await apiRequest("/admin/users", { token: adminToken });
    assert(usersRes.status === 200, `Admin list users failed: ${usersRes.status}`);
    assert(Array.isArray(usersRes.data.data.users), "users is not an array");

    // List appointments
    const apptsRes = await apiRequest("/admin/appointments", { token: adminToken });
    assert(apptsRes.status === 200, `Admin list appointments failed: ${apptsRes.status}`);
  });

  // 4. Patient books appointment, duplicate booking of same slot -> 409
  await test("Flow 4: Patient books appointment, duplicate slot booking -> 409", async () => {
    // Pick tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateStr = tomorrow.toISOString().split("T")[0];

    // Get doctor availability slots
    const slotsRes = await apiRequest(`/doctors/${doctorUser.doctorId}/availability?date=${dateStr}`);
    assert(slotsRes.status === 200, `Get slots failed: ${slotsRes.status}`);
    const availableSlot = slotsRes.data.data.slots.find((s) => s.available);
    assert(availableSlot, "No available slot found for doctor tomorrow");

    // Book appointment
    const bookRes = await apiRequest("/appointments", {
      method: "POST",
      token: patientToken,
      body: {
        doctorId: doctorUser.doctorId,
        appointmentDate: dateStr,
        startTime: availableSlot.startTime,
        appointmentType: "in-person",
        reason: "General checkup",
      },
    });
    assert(bookRes.status === 201, `Book appointment failed: ${bookRes.status}: ${JSON.stringify(bookRes.data)}`);
    testAppointmentId = bookRes.data.data.appointment.id || bookRes.data.data.appointment._id;

    // Attempt second booking of the exact same slot -> MUST RETURN 409
    const secondBookRes = await apiRequest("/appointments", {
      method: "POST",
      token: patientToken,
      body: {
        doctorId: doctorUser.doctorId,
        appointmentDate: dateStr,
        startTime: availableSlot.startTime,
        appointmentType: "in-person",
        reason: "Conflicting checkup",
      },
    });
    assert(
      secondBookRes.status === 409,
      `Expected 409 on duplicate slot booking, got ${secondBookRes.status}: ${JSON.stringify(secondBookRes.data)}`
    );
  });

  // 5. Patient reschedules (past date rejected -> 400) and cancels. Admin & Doctor cancel via POST /appointments/:id/cancel
  await test("Flow 5: Reschedule (past date rejected 400), cancellations by patient, doctor, and admin", async () => {
    // Try rescheduling to a past date -> MUST return 400
    const pastReschedule = await apiRequest(`/appointments/${testAppointmentId}/reschedule`, {
      method: "POST",
      token: patientToken,
      body: {
        newDate: "2020-01-01",
        newStartTime: "10:00",
      },
    });
    assert(
      pastReschedule.status === 400,
      `Expected 400 for past reschedule date, got ${pastReschedule.status}: ${JSON.stringify(pastReschedule.data)}`
    );

    // Reschedule to day after tomorrow
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    const dayAfterStr = dayAfter.toISOString().split("T")[0];

    const slotsRes = await apiRequest(`/doctors/${doctorUser.doctorId}/availability?date=${dayAfterStr}`);
    const availableSlot = slotsRes.data.data.slots.find((s) => s.available);
    assert(availableSlot, "No slot available for day after tomorrow");

    const validReschedule = await apiRequest(`/appointments/${testAppointmentId}/reschedule`, {
      method: "POST",
      token: patientToken,
      body: {
        newDate: dayAfterStr,
        newStartTime: availableSlot.startTime,
      },
    });
    assert(validReschedule.status === 200, `Reschedule failed: ${validReschedule.status}: ${JSON.stringify(validReschedule.data)}`);

    // Cancel by patient
    const cancelPatientRes = await apiRequest(`/appointments/${testAppointmentId}/cancel`, {
      method: "POST",
      token: patientToken,
    });
    assert(cancelPatientRes.status === 200, `Patient cancel failed: ${cancelPatientRes.status}`);

    // Create another appointment to test doctor cancel
    const day3 = new Date();
    day3.setDate(day3.getDate() + 3);
    const day3Str = day3.toISOString().split("T")[0];
    const slots3Res = await apiRequest(`/doctors/${doctorUser.doctorId}/availability?date=${day3Str}`);
    const slot3 = slots3Res.data.data.slots.find((s) => s.available);

    const appt2Res = await apiRequest("/appointments", {
      method: "POST",
      token: patientToken,
      body: {
        doctorId: doctorUser.doctorId,
        appointmentDate: day3Str,
        startTime: slot3.startTime,
        appointmentType: "in-person",
        reason: "Test doctor cancel",
      },
    });
    const appt2Id = appt2Res.data.data.appointment.id || appt2Res.data.data.appointment._id;

    // Doctor cancels
    const cancelDoctorRes = await apiRequest(`/appointments/${appt2Id}/cancel`, {
      method: "POST",
      token: doctorToken,
    });
    assert(cancelDoctorRes.status === 200, `Doctor cancel failed: ${cancelDoctorRes.status}`);

    // Create 3rd appointment to test admin cancel
    const day4 = new Date();
    day4.setDate(day4.getDate() + 4);
    const day4Str = day4.toISOString().split("T")[0];
    const slots4Res = await apiRequest(`/doctors/${doctorUser.doctorId}/availability?date=${day4Str}`);
    const slot4 = slots4Res.data.data.slots.find((s) => s.available);

    const appt3Res = await apiRequest("/appointments", {
      method: "POST",
      token: patientToken,
      body: {
        doctorId: doctorUser.doctorId,
        appointmentDate: day4Str,
        startTime: slot4.startTime,
        appointmentType: "in-person",
        reason: "Test admin cancel",
      },
    });
    const appt3Id = appt3Res.data.data.appointment.id || appt3Res.data.data.appointment._id;

    // Admin cancels
    const cancelAdminRes = await apiRequest(`/appointments/${appt3Id}/cancel`, {
      method: "POST",
      token: adminToken,
    });
    assert(cancelAdminRes.status === 200, `Admin cancel failed: ${cancelAdminRes.status}`);
  });

  // 6. Doctor completes an appointment; cancelled appointment must NOT be completable
  await test("Flow 6: Doctor completes appointment; cancelled appointment cannot be completed", async () => {
    // Attempt to complete the cancelled appointment from Flow 5 -> MUST return 400
    const completeCancelled = await apiRequest(`/appointments/${testAppointmentId}/complete`, {
      method: "POST",
      token: doctorToken,
    });
    assert(
      completeCancelled.status === 400,
      `Expected 400 when completing cancelled appointment, got ${completeCancelled.status}`
    );

    // Book a fresh appointment and complete it
    const day5 = new Date();
    day5.setDate(day5.getDate() + 5);
    const day5Str = day5.toISOString().split("T")[0];
    const slotsRes = await apiRequest(`/doctors/${doctorUser.doctorId}/availability?date=${day5Str}`);
    const slot = slotsRes.data.data.slots.find((s) => s.available);

    const apptRes = await apiRequest("/appointments", {
      method: "POST",
      token: patientToken,
      body: {
        doctorId: doctorUser.doctorId,
        appointmentDate: day5Str,
        startTime: slot.startTime,
        appointmentType: "in-person",
        reason: "Completion test",
      },
    });
    testAppointmentId = apptRes.data.data.appointment.id || apptRes.data.data.appointment._id;

    const completeRes = await apiRequest(`/appointments/${testAppointmentId}/complete`, {
      method: "POST",
      token: doctorToken,
    });
    assert(completeRes.status === 200, `Complete appointment failed: ${completeRes.status}`);
  });

  // 7. Doctor issues a prescription (cancelled appointment rejected); patient lists prescriptions
  await test("Flow 7: Doctor issues prescription (cancelled rejected); patient lists prescriptions", async () => {
    // Try issuing prescription on a cancelled appointment -> MUST return 400
    const queryCancelled = await pool.query(`SELECT id FROM appointments WHERE status = 'CANCELLED' LIMIT 1`);
    if (queryCancelled.rows.length > 0) {
      const cancelledId = queryCancelled.rows[0].id;
      const badRxRes = await apiRequest("/prescriptions", {
        method: "POST",
        token: doctorToken,
        body: {
          appointmentId: cancelledId,
          diagnosis: "Test Diagnosis",
        },
      });
      assert(
        badRxRes.status === 400,
        `Expected 400 issuing prescription for cancelled appointment, got ${badRxRes.status}`
      );
    }

    // Issue valid prescription on completed appointment
    const rxRes = await apiRequest("/prescriptions", {
      method: "POST",
      token: doctorToken,
      body: {
        appointmentId: testAppointmentId,
        diagnosis: "Seasonal Allergies",
        medicines: [
          { name: "Cetirizine 10mg", dosage: "1 tablet", frequency: "Once daily", duration: "7 days" },
        ],
        advice: "Stay hydrated and avoid pollen.",
      },
    });
    assert(rxRes.status === 201, `Issue prescription failed: ${rxRes.status}: ${JSON.stringify(rxRes.data)}`);
    testPrescriptionId = rxRes.data.data.prescriptionId;

    // Patient lists prescriptions
    const patRxRes = await apiRequest("/prescriptions/my", { token: patientToken });
    assert(patRxRes.status === 200, `Patient get prescriptions failed: ${patRxRes.status}`);
    assert(Array.isArray(patRxRes.data.data.prescriptions), "prescriptions is not an array");
    const found = patRxRes.data.data.prescriptions.find((p) => (p.id || p._id) === testPrescriptionId);
    assert(found, "Issued prescription not found in patient prescriptions list");
  });

  // 8. Patient uploads a medical record, shares with doctor, doctor sees it, patient deletes it
  await test("Flow 8: Patient uploads record, shares with doctor, doctor views, patient deletes", async () => {
    // Create multipart form data with a text buffer as a mock file
    const boundary = "----SmokeBoundary" + Date.now();
    const fileContent = "Simulated medical test report content for MediBook smoke testing.";
    const bodyStr =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="title"\r\n\r\nSmoke Lab Report\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="category"\r\n\r\nLab Report\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="description"\r\n\r\nBlood panel results\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="report.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n` +
      fileContent +
      `\r\n--${boundary}--\r\n`;

    const uploadRes = await apiRequest("/medical-records", {
      method: "POST",
      token: patientToken,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: bodyStr,
    });
    assert(uploadRes.status === 201, `Upload record failed: ${uploadRes.status}: ${JSON.stringify(uploadRes.data)}`);
    testRecordId = uploadRes.data.data.record.id || uploadRes.data.data.record._id;

    // Share with doctor
    const shareRes = await apiRequest("/medical-records/share", {
      method: "POST",
      token: patientToken,
      body: {
        recordId: testRecordId,
        doctorId: doctorUser.doctorId,
      },
    });
    assert(shareRes.status === 200, `Share record failed: ${shareRes.status}`);

    // Doctor checks shared-with-me
    const sharedRes = await apiRequest("/medical-records/shared-with-me", {
      token: doctorToken,
    });
    assert(sharedRes.status === 200, `Doctor shared-with-me failed: ${sharedRes.status}`);
    const foundShared = sharedRes.data.data.records.find((r) => (r.id || r._id) === testRecordId);
    assert(foundShared, "Shared record not found in doctor's shared-with-me list");

    // Patient deletes record
    const deleteRes = await apiRequest(`/medical-records/${testRecordId}`, {
      method: "DELETE",
      token: patientToken,
    });
    assert(deleteRes.status === 200, `Delete record failed: ${deleteRes.status}`);
  });

  // 9. Patient reviews completed appointment (1-5 integer rating); Admin toggles approval & doctor rating updates
  await test("Flow 9: Patient reviews completed appointment; Admin toggles approval & updates rating", async () => {
    // Rating must be integer 1-5; check invalid rating
    const badReviewRes = await apiRequest("/reviews", {
      method: "POST",
      token: patientToken,
      body: {
        appointmentId: testAppointmentId,
        rating: 6,
        comment: "Invalid rating test",
      },
    });
    assert(badReviewRes.status === 400, `Expected 400 for rating 6, got ${badReviewRes.status}`);

    // Submit valid review
    const reviewRes = await apiRequest("/reviews", {
      method: "POST",
      token: patientToken,
      body: {
        appointmentId: testAppointmentId,
        rating: 5,
        comment: "Excellent care and clear explanations!",
      },
    });
    assert(reviewRes.status === 201, `Submit review failed: ${reviewRes.status}: ${JSON.stringify(reviewRes.data)}`);

    // Admin lists reviews to find the review
    const adminRevRes = await apiRequest("/reviews", { token: adminToken });
    assert(adminRevRes.status === 200, `Admin get reviews failed: ${adminRevRes.status}`);
    const review = adminRevRes.data.data.reviews[0];
    assert(review, "No review found in admin review list");
    const reviewId = review.id || review._id;

    // Admin toggles approval
    const toggleRes = await apiRequest(`/reviews/${reviewId}/approval`, {
      method: "PUT",
      token: adminToken,
    });
    assert(toggleRes.status === 200, `Toggle review approval failed: ${toggleRes.status}`);
  });

  // 10. Notifications: list, unread-count, mark one read, mark all read
  await test("Flow 10: Notifications: list, unread-count, mark one read, mark all read", async () => {
    // List notifications
    const listRes = await apiRequest("/notifications", { token: patientToken });
    assert(listRes.status === 200, `List notifications failed: ${listRes.status}`);
    assert(Array.isArray(listRes.data.data.notifications), "notifications is not an array");

    // Unread count
    const unreadRes = await apiRequest("/notifications/unread-count", { token: patientToken });
    assert(unreadRes.status === 200, `Get unread count failed: ${unreadRes.status}`);
    assert(typeof unreadRes.data.data.count === "number", "unread count is not a number");

    // Mark one read if notifications exist
    if (listRes.data.data.notifications.length > 0) {
      const notifId = listRes.data.data.notifications[0].id || listRes.data.data.notifications[0]._id;
      const readOne = await apiRequest(`/notifications/${notifId}/read`, {
        method: "POST",
        token: patientToken,
      });
      assert(readOne.status === 200, `Mark one notification read failed: ${readOne.status}`);
    }

    // Mark all read
    const readAll = await apiRequest("/notifications/read-all", {
      method: "POST",
      token: patientToken,
    });
    assert(readAll.status === 200, `Mark all read failed: ${readAll.status}`);
  });

  // 11. Symptom checker (POST /ai/symptom-check)
  await test("Flow 11: AI symptom checker (POST /ai/symptom-check)", async () => {
    const aiRes = await apiRequest("/ai/symptom-check", {
      method: "POST",
      token: patientToken,
      body: {
        symptoms: "I have had a continuous headache, mild fever and runny nose for two days.",
      },
    });
    assert(aiRes.status === 200, `Symptom check failed: ${aiRes.status}: ${JSON.stringify(aiRes.data)}`);
    assert(aiRes.data.data, "No data returned in AI symptom response");
  });

  // 12. Token refresh: expired access token silently refreshes and user is not logged out
  await test("Flow 12: Token refresh endpoint rotates token correctly", async () => {
    // Test refresh endpoint directly with cookie or payload
    const loginRes = await apiRequest("/auth/login", {
      method: "POST",
      body: { email: patientEmail, password: "Password123!" },
    });
    const setCookie = loginRes.headers.get("set-cookie");

    const refreshRes = await apiRequest("/auth/refresh", {
      method: "POST",
      headers: setCookie ? { Cookie: setCookie } : {},
    });
    assert(refreshRes.status === 200, `Token refresh failed: ${refreshRes.status}: ${JSON.stringify(refreshRes.data)}`);
    assert(refreshRes.data.data.accessToken, "No new access token returned from refresh");
  });

  console.log(`\n==============================================`);
  console.log(`Smoke Test Summary: ${passCount} PASSED, ${failCount} FAILED out of ${results.length} tests`);
  console.log(`==============================================\n`);

  await pool.end();
  if (failCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAll().catch(async (err) => {
  console.error("Unhandled smoke test error:", err);
  await pool.end();
  process.exit(1);
});
