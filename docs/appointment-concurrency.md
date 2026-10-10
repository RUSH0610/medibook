# Appointment Scheduling & Concurrency Architecture

## 1. The Race Condition Problem

In modern healthcare platforms, appointment slots represent scarce, mutually exclusive resources. When two patients attempt to book the same doctor at the same date and time simultaneously, a naive system will suffer from race conditions leading to **double booking**.

### 1.1 The Naive Implementation (Anti-Pattern)
In the previous MongoDB implementation, the booking flow operated as follows:
```
Thread 1 (Patient A)                      Thread 2 (Patient B)
      |                                         |
      |-- 1. Read doctor document               |
      |   (slot 10:30 is free)                  |
      |                                         |-- 1. Read doctor document
      |                                         |   (slot 10:30 is free)
      |-- 2. Update doc slots_booked with 10:30 |
      |                                         |-- 2. Update doc slots_booked with 10:30
      |-- 3. Insert Appointment document        |
      |                                         |-- 3. Insert Appointment document
      v                                         v
   SUCCESS                                   SUCCESS (Double Booked!)
```
Even if an atomic `$push` condition was attempted on an embedded array, cancellation read the entire array into Node.js memory, filtered it, and saved it back:
```javascript
// Previous dangerous code:
let slots_booked = doctorData.slots_booked;
slots_booked[slotDate] = slots_booked[slotDate].filter(e => e !== slotTime);
await doctorModel.findByIdAndUpdate(docId, { slots_booked });
```
If an appointment was booked between the `findById` and `findByIdAndUpdate`, that new booking was completely wiped out!

---

## 2. PostgreSQL Multi-Layer Concurrency Strategy

MediBook solves this using **Defense in Depth** combining:
1. **Dynamic Dynamic Availability & Leave Verification**
2. **Pessimistic Row-Level Locking (`SELECT FOR UPDATE`)**
3. **ACID Transaction Isolation**
4. **Declarative Database-Level Partial Unique Index Constraint**

```
┌────────────────────────────────────────────────────────┐
│                   HTTP Request                         │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 1. Application Validation                              │
│    - Date must be >= today                             │
│    - Slot must match doctor's schedule                 │
│    - Doctor must not be on leave                       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 2. PostgreSQL Transaction (BEGIN)                      │
│    - Lock doctor row: SELECT ... FOR UPDATE            │
│    - Check for active overlapping appointments         │
│    - INSERT INTO appointments (...)                    │
│    - COMMIT                                            │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ 3. Database Engine Hard Boundary                       │
│    UNIQUE INDEX uq_active_doctor_slot                  │
│    (doctor_id, appointment_date, start_time)           │
│    WHERE status NOT IN ('CANCELLED')                   │
└────────────────────────────────────────────────────────┘
```

---

## 3. Database Constraint: The Ultimate Safeguard

Even if application servers run across a distributed cluster without shared memory, PostgreSQL enforces absolute serial consistency at the disk/WAL engine level via:

```sql
CREATE UNIQUE INDEX uq_active_doctor_slot 
ON appointments(doctor_id, appointment_date, start_time) 
WHERE status NOT IN ('CANCELLED');
```

### Why a Partial Unique Index?
- **Mutual Exclusion**: Ensures that for any doctor, on any given date, at any given start time, only **one** appointment can have a status of `CONFIRMED`, `PENDING`, or `COMPLETED`.
- **Zero-Friction Cancellation**: When an appointment is marked `CANCELLED`, it is immediately excluded from the partial index predicate `WHERE status NOT IN ('CANCELLED')`. This instantly makes the slot bookable by another patient without needing fragile in-memory array manipulation.

---

## 4. Concurrency Execution Flow

### 4.1 Booking Flow
1. **Validation**:
   - Ensure the slot falls within the doctor's weekly recurring `doctor_availability`.
   - Ensure date is not in `doctor_leave_blocks`.
   - Disallow past time slots for current date.
2. **ACID Transaction**:
   ```javascript
   await withTransaction(async (client) => {
     // 1. Pessimistic lock on the doctor's record to serialize slot checks
     const docCheck = await client.query(
       `SELECT id, consultation_fee, is_approved, is_available 
        FROM doctors WHERE id = $1 FOR UPDATE`,
       [doctorId]
     );
     if (!docCheck.rows.length || !docCheck.rows[0].is_available) {
       throw new ApiError(404, "Doctor is not currently available");
     }

     // 2. Check existing active booking
     const existing = await client.query(
       `SELECT id FROM appointments 
        WHERE doctor_id = $1 AND appointment_date = $2 AND start_time = $3 
          AND status NOT IN ('CANCELLED')`,
       [doctorId, appointmentDate, startTime]
     );
     if (existing.rows.length > 0) {
       const err = new ApiError(409, "This appointment slot is no longer available");
       err.errorCode = "SLOT_UNAVAILABLE";
       throw err;
     }

     // 3. Create appointment
     const insertRes = await client.query(
       `INSERT INTO appointments (
          patient_id, doctor_id, appointment_date, start_time, end_time,
          appointment_type, status, reason, notes, patient_phone, amount
        ) VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMED', $7, $8, $9, $10)
        RETURNING *`,
       [patientId, doctorId, appointmentDate, startTime, endTime, type, reason, notes, phone, fee]
     );
     return insertRes.rows[0];
   });
   ```
3. **Conflict Handling**:
   - If two concurrent transactions execute, the first acquires the row lock or commits the insert.
   - The second transaction either sees `existing.rows.length > 0` and throws `SLOT_UNAVAILABLE` (409), OR if executed in parallel before the lock, triggers PostgreSQL error code `23505` (`unique_violation` on `uq_active_doctor_slot`).
   - The backend catches `23505` and formats a clean standardized response:
     ```json
     {
       "success": false,
       "message": "This appointment slot is no longer available",
       "errorCode": "SLOT_UNAVAILABLE"
     }
     ```

---

## 5. Dynamic Slot Generation Algorithm

Instead of computing slots in the client browser with fixed static hardcoded hours (09:00 - 17:00), the backend computes availability dynamically in `GET /api/v1/doctors/:id/availability?date=YYYY-MM-DD`:

1. Look up the day of week for the requested date (e.g. `Monday`).
2. Query `doctor_availability` where `doctor_id = :id AND day_of_week = :day AND is_active = true`. If no availability defined, return empty slots.
3. Query `doctor_leave_blocks` where `doctor_id = :id AND leave_date = :date`. If a full-day leave block exists, mark all slots unavailable or empty.
4. Query all active appointments for the doctor on that date:
   `SELECT start_time, end_time FROM appointments WHERE doctor_id = :id AND appointment_date = :date AND status NOT IN ('CANCELLED')`.
5. Iteratively generate slots between `start_time` and `end_time` by increments of `slot_duration_minutes`:
   - If slot is in the past (for today's date), `available = false`.
   - If slot overlaps with an active appointment, `available = false`.
   - If slot overlaps with a partial-day leave block, `available = false`.
   - Otherwise, `available = true`.
6. Return dynamic slots array to the frontend.

---

## 6. Rescheduling Flow & Collision Prevention

Rescheduling is not simply "cancel old and create new", which could leave a patient with nothing if the new slot fails. It is executed atomically inside a transaction:
1. Verify patient ownership of the appointment.
2. Verify current status is `CONFIRMED` or `PENDING` (cannot reschedule `COMPLETED` or `CANCELLED`).
3. Validate requested new date and time slot against doctor's schedule and leave blocks.
4. Inside transaction, update `appointment_date`, `start_time`, `end_time`.
5. If the new slot is taken, the transaction aborts and rolls back; the original appointment is unchanged.
6. Trigger appointment rescheduled in-app notification.
