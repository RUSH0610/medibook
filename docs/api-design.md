# API Design

Base path: `/api/v1`. Auth is always `Authorization: Bearer <accessToken>`. Responses use
`{ success, statusCode, message, data }`.

Roles: **P**atient, **D**octor, **A**dmin, **Any** = any authenticated user, **Public** = no auth.

## Auth — `/auth`
| Method | Path | Access | Purpose |
|---|---|---|---|
| POST | `/register` | Public | Start patient signup, emails OTP |
| POST | `/verify-otp` | Public | Verify OTP, create account |
| POST | `/login` | Public | Login for all roles |
| POST | `/refresh` | Cookie | Rotate refresh token, new access token |
| POST | `/logout` | Public | Revoke current refresh token |
| POST | `/logout-all` | Any | Revoke every session |
| POST | `/forgot-password`, `/reset-password` | Public | OTP password reset |
| GET | `/me` | Any | Current user |

## Users — `/users`
`GET /profile`, `PUT /profile` (multipart, optional `image`) — Any.

## Doctors — `/doctors`
| Method | Path | Access |
|---|---|---|
| GET | `/`, `/specializations`, `/:id`, `/:id/availability?date=YYYY-MM-DD` | Public |
| GET / PUT | `/me/profile` | D |
| GET | `/me/analytics` | D |
| POST | `/me/toggle-availability` | D |
| GET / POST / DELETE | `/me/leaves`, `/me/leaves/:id` | D |

## Appointments — `/appointments`
| Method | Path | Access |
|---|---|---|
| POST | `/` | P — book |
| GET | `/my` | P |
| POST | `/:id/reschedule` | P |
| GET | `/doctor` | D |
| POST | `/:id/complete` | D |
| POST | `/:id/cancel` | owner P, treating D, or A |

## Prescriptions — `/prescriptions`
`POST /` (D), `GET /my` (P), `GET /doctor` (D), `GET /:id` (owner P / prescribing D / A).

## Medical records — `/medical-records`
`POST /` (P, multipart `file`), `GET /my` (P), `GET /timeline` (P), `POST /share` (P), `DELETE /:id` (P), `GET /shared-with-me` (D).

## Reviews — `/reviews`
`GET /doctor/:docId` (Public), `POST /` (P), `GET /` (A), `PUT /:id/approval` (A).

## Notifications — `/notifications`
`GET /`, `GET /unread-count`, `POST /read-all`, `POST /:id/read` — Any.

## Admin — `/admin` (A only)
`GET /dashboard`, `GET|POST /doctors`, `PUT /doctors/:id/approval`, `PUT /doctors/:id/availability`,
`GET /users`, `PUT /users/:id/status`, `GET /appointments`. Admins cancel appointments through `POST /appointments/:id/cancel`.

## AI — `/ai`
`POST /symptom-check` — Any.

## Errors
`{ success:false, statusCode, message, errors, code }`. Slot conflicts return `409` (`SLOT_UNAVAILABLE`); expired access tokens return `401` with `code: "TOKEN_EXPIRED"`.

## Cross-Cutting Conventions

### Module Layout (every feature follows this pattern)
```
src/modules/<name>/
  <name>.routes.js      – express.Router only; attaches middleware, delegates to controller
  <name>.controller.js  – one asyncHandler per action; calls exactly one service function
  <name>.service.js     – all DB queries and business logic; throws ApiError on failures
```
Controllers **never** contain try/catch or DB queries.  
Services **never** set HTTP responses; they throw `ApiError(statusCode, message, errors, code)`.

### Request Validation
Routes that mutate data are protected by validators in `validate.middleware.js`:
- `validateBookAppointment` – slot date/time format, appointmentType enum
- `validateRescheduleAppointment` – date/time only (not in the past)
- `validatePrescription` – diagnosis required, medicines array non-empty
- `validateReview` – rating 1-5, comment required

All validation failures return `400 Bad Request` with `errors` listing field messages.

### Rate Limiting
Auth endpoints (`/register`, `/login`, `/forgot-password`) are wrapped in an in-memory sliding-window limiter (`rateLimit.middleware.js`): **5 requests per 15 minutes per IP**.  
OTP verification allows **5 wrong guesses** before the OTP is invalidated and a `429` is returned.

### Medical Record Delivery
Records uploaded to Cloudinary with `type: "authenticated"`. The `GET /my` and `GET /shared-with-me` endpoints return a signed URL valid for **1 hour** instead of the permanent public URL.

### ID Consistency
All API responses use `id` (UUID). Frontend pages support both `obj.id` and `obj._id` for backward compatibility with any cached data.
