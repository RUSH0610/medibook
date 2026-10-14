import "dotenv/config";
import { pool } from "../src/db/index.js";

export async function runIntegrityCheck() {
  console.log("=== RUNNING DATABASE INTEGRITY READ-ONLY CHECK ===");
  const client = await pool.connect();

  try {
    // 1. Duplicate active slots
    const dupSlots = await client.query(`
      SELECT doctor_id, appointment_date, start_time, COUNT(*) as count
      FROM appointments
      WHERE status <> 'CANCELLED'
      GROUP BY doctor_id, appointment_date, start_time
      HAVING COUNT(*) > 1
    `);

    // 2. Invalid appointment status
    const invalidStatus = await client.query(`
      SELECT DISTINCT status
      FROM appointments
      WHERE status NOT IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW')
    `);

    // 3. Invalid appointment type
    const invalidType = await client.query(`
      SELECT DISTINCT appointment_type
      FROM appointments
      WHERE appointment_type NOT IN ('in-person', 'video', 'phone')
    `);

    // 4. Invalid review rating
    const invalidRating = await client.query(`
      SELECT DISTINCT rating
      FROM reviews
      WHERE rating < 1 OR rating > 5
    `);

    // 5. Duplicate doctor availability day
    const dupAvailability = await client.query(`
      SELECT doctor_id, day_of_week, COUNT(*) as count
      FROM doctor_availability
      GROUP BY doctor_id, day_of_week
      HAVING COUNT(*) > 1
    `);

    console.log("\n--- RESULT SUMMARY ---");
    console.log(`1. Duplicate Active Slots count: ${dupSlots.rows.length}`);
    if (dupSlots.rows.length > 0) console.log("   Rows:", dupSlots.rows);

    console.log(`2. Invalid Appointment Statuses count: ${invalidStatus.rows.length}`);
    if (invalidStatus.rows.length > 0) console.log("   Statuses:", invalidStatus.rows.map(r => r.status));

    console.log(`3. Invalid Appointment Types count: ${invalidType.rows.length}`);
    if (invalidType.rows.length > 0) console.log("   Types:", invalidType.rows.map(r => r.type));

    console.log(`4. Invalid Review Ratings count: ${invalidRating.rows.length}`);
    if (invalidRating.rows.length > 0) console.log("   Ratings:", invalidRating.rows.map(r => r.rating));

    console.log(`5. Duplicate Doctor Availability Days count: ${dupAvailability.rows.length}`);
    if (dupAvailability.rows.length > 0) console.log("   Rows:", dupAvailability.rows);

    return {
      dupSlots: dupSlots.rows,
      invalidStatus: invalidStatus.rows,
      invalidType: invalidType.rows,
      invalidRating: invalidRating.rows,
      dupAvailability: dupAvailability.rows
    };
  } finally {
    client.release();
  }
}

if (process.argv[1].endsWith("check_integrity.js")) {
  runIntegrityCheck()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
