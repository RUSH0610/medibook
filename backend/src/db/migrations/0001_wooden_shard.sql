ALTER TABLE "otps" ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_active_doctor_slot" ON "appointments" USING btree ("doctor_id","appointment_date","start_time") WHERE status <> 'CANCELLED';--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "uq_doctor_availability_day" ON "doctor_availability" USING btree ("doctor_id","day_of_week");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "chk_appointment_end_time" CHECK (end_time > start_time);--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "chk_appointment_status" CHECK (status IN ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW'));--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "chk_appointment_type" CHECK (appointment_type IN ('in-person', 'video', 'phone'));--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "chk_review_rating" CHECK (rating >= 1 AND rating <= 5);