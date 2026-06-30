import axios from "axios"
const BASE = import.meta.env.VITE_BACKEND_URL

export const loginUser         = (data)        => axios.post(`${BASE}/api/v1/users/login`, data)
export const registerUser      = (data)        => axios.post(`${BASE}/api/v1/users/register`, data)
export const getUserProfile    = (token)       => axios.get(`${BASE}/api/v1/users/get-profile`, { headers: { token } })
export const updateUserProfile = (data, token) => axios.post(`${BASE}/api/v1/users/update-profile`, data, { headers: { token } })
export const bookAppointment   = (data, token) => axios.post(`${BASE}/api/v1/users/book-appointment`, data, { headers: { token } })
export const listAppointments  = (token)       => axios.get(`${BASE}/api/v1/users/appointments`, { headers: { token } })
export const cancelAppointment = (data, token) => axios.post(`${BASE}/api/v1/users/cancel-appointment`, data, { headers: { token } })
