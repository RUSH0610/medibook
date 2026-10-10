import "dotenv/config";
import bcrypt from "bcrypt";
import { pool, query } from "../src/db/index.js";
import { fileURLToPath } from "url";

export async function cleanupDemoAndRotateAdmin() {
  console.log("[Production Cleanup & Security] Starting admin password rotation & demo account cleanup...");

  const adminEmail = process.env.ADMIN_EMAIL || "admin@medibook.com";
  const newAdminPassword = process.env.NEW_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD;

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Rotate Admin Password if a new password is provided
    if (newAdminPassword) {
      console.log(`[Security] Rotating password for admin account: ${adminEmail}`);
      const hashedPassword = await bcrypt.hash(newAdminPassword, 10);
      const updateRes = await client.query(
        `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE email = $2 AND role = 'ADMIN' RETURNING id`,
        [hashedPassword, adminEmail]
      );

      if (updateRes.rowCount > 0) {
        console.log(`[Security] Admin password successfully rotated for ${adminEmail}.`);
      } else {
        console.warn(`[Security] Admin user ${adminEmail} not found. Creating new admin user with provided credentials.`);
        await client.query(
          `INSERT INTO users (name, email, password_hash, role, phone, is_active, is_verified)
           VALUES ('System Administrator', $1, $2, 'ADMIN', '+1-800-555-0199', true, true)`,
          [adminEmail, hashedPassword]
        );
        console.log(`[Security] Admin account created for ${adminEmail}.`);
      }
    } else {
      console.log("[Security] No NEW_ADMIN_PASSWORD or ADMIN_PASSWORD set in env. Skipping admin password rotation.");
    }

    // 2. Disable / Deactivate Demo Accounts in Production
    const demoEmails = [
      "richard.james@medibook.com",
      "emily.larson@medibook.com",
      "christopher.lee@medibook.com",
      "sarah.patel@medibook.com",
      "patient@medibook.com",
    ];

    console.log("[Security] Disabling demo accounts...");
    const disableRes = await client.query(
      `UPDATE users SET is_active = false, updated_at = NOW() WHERE email = ANY($1::text[]) RETURNING email`,
      [demoEmails]
    );

    const deactivatedEmails = disableRes.rows.map((r) => r.email);
    console.log(`[Security] Deactivated ${deactivatedEmails.length} demo accounts:`, deactivatedEmails);

    await client.query("COMMIT");
    console.log("[Production Cleanup & Security] Execution completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Production Cleanup & Security] Failed:", error);
    throw error;
  } finally {
    client.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  cleanupDemoAndRotateAdmin()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
