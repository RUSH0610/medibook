import "dotenv/config";
import bcrypt from "bcrypt";
import { pool } from "./index.js";
import { fileURLToPath } from "url";

/**
 * Safe production database boot seeder.
 * - Seeds core medical specializations (idempotent, DO NOTHING).
 * - Creates default system administrator ONLY if no admin exists (never overwrites existing passwords).
 */
export const seedDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    console.log("[Seeder] Checking and initializing base database records...");

    // 1. Seed Core Specializations
    const specializations = [
      { name: "General physician", description: "Comprehensive primary care, chronic condition management, and preventive medicine." },
      { name: "Gynecologist", description: "Specialized care for women's reproductive health, prenatal care, and wellness." },
      { name: "Dermatologist", description: "Diagnosis and clinical treatment of skin, hair, and nail disorders." },
      { name: "Pediatricians", description: "Compassionate medical care for infants, children, and adolescents." },
      { name: "Neurologist", description: "Expert care for brain, spinal cord, and neurological conditions." },
      { name: "Gastroenterologist", description: "Advanced care for digestive system and gastrointestinal disorders." },
      { name: "Cardiologist", description: "Cardiovascular health, heart disease prevention, and hypertension management." },
      { name: "Orthopedics", description: "Musculoskeletal health, joint care, sports medicine, and bone injury treatment." },
    ];

    let specCount = 0;
    for (const spec of specializations) {
      const res = await client.query(
        `INSERT INTO specializations (name, description)
         VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING
         RETURNING id`,
        [spec.name, spec.description]
      );
      if (res.rowCount > 0) specCount++;
    }
    console.log(`[Seeder] Specializations checked. ${specCount} new specializations inserted.`);

    // 2. Check if an ADMIN user already exists
    const adminCheck = await client.query(`SELECT id FROM users WHERE role = 'ADMIN' LIMIT 1`);

    if (adminCheck.rows.length === 0) {
      const adminEmail = process.env.ADMIN_EMAIL || "admin@medibook.com";
      const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
      const adminPasswordHash = await bcrypt.hash(adminPassword, 10);

      await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone, is_active, is_verified)
         VALUES ($1, $2, $3, 'ADMIN', '+1-800-555-0199', true, true)
         ON CONFLICT (email) DO NOTHING`,
        ["System Administrator", adminEmail, adminPasswordHash]
      );
      console.log(`[Seeder] Created initial Admin account: ${adminEmail}`);
    } else {
      console.log("[Seeder] Admin account already exists. Password retained.");
    }

    await client.query("COMMIT");
    console.log("[Seeder] Base seeder execution completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Seeder] Base seeder failed:", error);
    throw error;
  } finally {
    client.release();
  }
};

// Run directly if invoked from CLI
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDatabase()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
