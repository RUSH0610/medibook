import "dotenv/config";
import bcrypt from "bcrypt";
import { pool } from "../src/db/index.js";
import { fileURLToPath } from "url";

export const seedDemoData = async () => {
  if (process.env.NODE_ENV === "production") {
    throw new Error("[Seeder Refused] Demo data seeding is strictly forbidden in production (NODE_ENV === 'production').");
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    console.log("[Demo Seeder] Seeding demo doctors and patient accounts...");

    // Fetch specializations map
    const specRes = await client.query(`SELECT id, name FROM specializations`);
    const specMap = new Map();
    specRes.rows.forEach((r) => specMap.set(r.name, r.id));

    // Demo Doctors
    const doctorsData = [
      {
        name: "Dr. Richard James",
        email: "richard.james@medibook.com",
        password: "doctor123456",
        speciality: "General physician",
        degree: "MBBS, MD - General Medicine",
        experienceYears: 6,
        bio: "Dr. Richard James has over 6 years of experience in managing acute illnesses, lifestyle disorders, and preventive health checks.",
        fee: 50.0,
        avatar: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&auto=format&fit=crop&q=80",
        address: { line1: "17th Cross, Richmond", line2: "Circle, London" },
        hospital: "City Central Hospital",
        room: "Suite 302",
      },
      {
        name: "Dr. Emily Larson",
        email: "emily.larson@medibook.com",
        password: "doctor123456",
        speciality: "Gynecologist",
        degree: "MBBS, MS - Obstetrics & Gynaecology",
        experienceYears: 8,
        bio: "Dr. Emily Larson is dedicated to comprehensive women's health, prenatal guidance, and minimally invasive gynecological care.",
        fee: 60.0,
        avatar: "https://images.unsplash.com/photo-1594824813571-638f02614d3f?w=400&auto=format&fit=crop&q=80",
        address: { line1: "27th Cross, Pall Mall", line2: "West End, London" },
        hospital: "St. Jude Women Care",
        room: "Clinic B",
      },
      {
        name: "Dr. Christopher Lee",
        email: "christopher.lee@medibook.com",
        password: "doctor123456",
        speciality: "Dermatologist",
        degree: "MBBS, DDVL",
        experienceYears: 5,
        bio: "Dr. Christopher Lee specializes in clinical dermatology, acne therapies, allergic skin conditions, and aesthetic treatments.",
        fee: 45.0,
        avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&auto=format&fit=crop&q=80",
        address: { line1: "4th Avenue, Kingsway", line2: "Holborn, London" },
        hospital: "DermaHealth Institute",
        room: "Room 105",
      },
      {
        name: "Dr. Sarah Patel",
        email: "sarah.patel@medibook.com",
        password: "doctor123456",
        speciality: "Pediatricians",
        degree: "MBBS, DCH, DNB - Pediatrics",
        experienceYears: 7,
        bio: "Dr. Sarah Patel provides dedicated pediatric healthcare, immunization schedules, and developmental tracking for young children.",
        fee: 55.0,
        avatar: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&auto=format&fit=crop&q=80",
        address: { line1: "57th Cross, Camden", line2: "High Street, London" },
        hospital: "Bright Futures Children Clinic",
        room: "Pediatric Wing 1",
      },
      {
        name: "Dr. David White",
        email: "david.white@medibook.com",
        password: "doctor123456",
        speciality: "Neurologist",
        degree: "MBBS, DM - Neurology",
        experienceYears: 10,
        bio: "Dr. David White is a senior consultant neurologist with vast expertise in migraine, neuropathies, and neuromuscular disorders.",
        fee: 80.0,
        avatar: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&auto=format&fit=crop&q=80",
        address: { line1: "12th Crescent, Mayfair", line2: "Central London" },
        hospital: "Metropolitan Neuroscience Hospital",
        room: "Neuro Center 4",
      },
      {
        name: "Dr. Robert Garcia",
        email: "robert.garcia@medibook.com",
        password: "doctor123456",
        speciality: "Gastroenterologist",
        degree: "MBBS, MD, DM - Gastroenterology",
        experienceYears: 9,
        bio: "Dr. Robert Garcia specializes in chronic acid reflux, IBS, digestive endoscopies, and liver health.",
        fee: 70.0,
        avatar: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&auto=format&fit=crop&q=80",
        address: { line1: "33 Baker Street", line2: "Marylebone, London" },
        hospital: "Digestive Health Clinic",
        room: "Suite 210",
      },
      {
        name: "Dr. Amanda Chen",
        email: "amanda.chen@medibook.com",
        password: "doctor123456",
        speciality: "Orthopedics",
        degree: "MBBS, MS - Orthopaedics",
        experienceYears: 8,
        bio: "Dr. Amanda Chen is an expert orthopedic surgeon focusing on sports injuries, knee and hip pain, and joint rehabilitation.",
        fee: 75.0,
        avatar: "https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&auto=format&fit=crop&q=80",
        address: { line1: "88 Harley Street", line2: "Westminster, London" },
        hospital: "London Orthopedic Pavilion",
        room: "Clinic 5",
      }
    ];

    const weekDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    for (const d of doctorsData) {
      const docPasswordHash = await bcrypt.hash(d.password, 10);
      const userRes = await client.query(
        `INSERT INTO users (name, email, password_hash, role, phone, avatar_url, is_active, is_verified)
         VALUES ($1, $2, $3, 'DOCTOR', '+44-20-7946-0991', $4, true, true)
         ON CONFLICT (email) DO UPDATE SET 
           name = EXCLUDED.name,
           password_hash = EXCLUDED.password_hash,
           avatar_url = EXCLUDED.avatar_url,
           is_active = true
         RETURNING id`,
        [d.name, d.email, docPasswordHash, d.avatar]
      );
      const docUserId = userRes.rows[0].id;
      const specId = specMap.get(d.speciality);

      const docRes = await client.query(
        `INSERT INTO doctors (
           user_id, specialization_id, qualification, experience_years, 
           bio, consultation_fee, license_number, is_approved, is_available,
           hospital_affiliation, consultation_room, address, avg_rating, total_reviews
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true, $8, $9, $10, 4.8, 12)
         ON CONFLICT (user_id) DO UPDATE SET
           specialization_id = EXCLUDED.specialization_id,
           qualification = EXCLUDED.qualification,
           experience_years = EXCLUDED.experience_years,
           bio = EXCLUDED.bio,
           consultation_fee = EXCLUDED.consultation_fee,
           hospital_affiliation = EXCLUDED.hospital_affiliation,
           consultation_room = EXCLUDED.consultation_room,
           address = EXCLUDED.address
         RETURNING id`,
        [
          docUserId,
          specId,
          d.degree,
          d.experienceYears,
          d.bio,
          d.fee,
          `MED-${Math.floor(10000 + Math.random() * 90000)}`,
          d.hospital,
          d.room,
          JSON.stringify(d.address)
        ]
      );
      const doctorId = docRes.rows[0].id;

      // Seed Availability
      for (const day of weekDays) {
        await client.query(
          `INSERT INTO doctor_availability (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, is_active)
           VALUES ($1, $2, '09:00:00', '17:00:00', 30, true)
           ON CONFLICT (doctor_id, day_of_week) DO UPDATE SET
             start_time = EXCLUDED.start_time,
             end_time = EXCLUDED.end_time,
             slot_duration_minutes = EXCLUDED.slot_duration_minutes,
             is_active = true`,
          [doctorId, day]
        );
      }
    }
    console.log(`[Demo Seeder] Seeded ${doctorsData.length} demo doctors with schedules.`);

    // Demo Patient
    const patientPasswordHash = await bcrypt.hash("patient123", 10);
    const patientUserRes = await client.query(
      `INSERT INTO users (name, email, password_hash, role, phone, avatar_url, is_active, is_verified)
       VALUES ($1, $2, $3, 'PATIENT', '+1-555-0144', '', true, true)
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, is_active = true
       RETURNING id`,
      ["Jane Doe", "patient@medibook.com", patientPasswordHash]
    );
    const patientUserId = patientUserRes.rows[0].id;

    await client.query(
      `INSERT INTO patients (
         user_id, date_of_birth, gender, blood_group, 
         insurance_provider, insurance_policy_no,
         emergency_contact_name, emergency_contact_phone, emergency_contact_relation,
         allergies, chronic_conditions, current_medications, past_surgeries, address
       ) VALUES ($1, '1995-06-15', 'Female', 'O+', 'BlueCross Shield', 'BCS-992144', 'John Doe', '+1-555-0145', 'Spouse', ARRAY['Penicillin'], ARRAY['Mild Asthma'], ARRAY['Albuterol Inhaler'], ARRAY['Appendectomy (2018)'], $2)
       ON CONFLICT (user_id) DO NOTHING`,
      [patientUserId, JSON.stringify({ line1: "123 Maple Street", line2: "Apt 4B, New York" })]
    );
    console.log(`[Demo Seeder] Seeded Patient account: patient@medibook.com / patient123`);

    await client.query("COMMIT");
    console.log("[Demo Seeder] Demo seeding completed successfully!");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("[Demo Seeder] Demo seeding failed:", error);
    throw error;
  } finally {
    client.release();
  }
};

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  seedDemoData()
    .then(() => pool.end())
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
