import axios from "axios"
const BASE = import.meta.env.VITE_BACKEND_URL

export const loginAdmin           = (data)        => axios.post(`${BASE}/api/v1/admin/login`, data)
export const addDoctor            = (data, token) => axios.post(`${BASE}/api/v1/admin/add-doctor`, data, { headers: { atoken: token } })
export const getAllDoctors         = (token)       => axios.get(`${BASE}/api/v1/admin/all-doctors`, { headers: { atoken: token } })
export const changeAvailability   = (data, token) => axios.post(`${BASE}/api/v1/admin/change-availability`, data, { headers: { atoken: token } })
export const getAdminDashboard    = (token)       => axios.get(`${BASE}/api/v1/admin/dashboard`, { headers: { atoken: token } })
export const getAdminAppointments = (token)       => axios.get(`${BASE}/api/v1/admin/appointments`, { headers: { atoken: token } })
export const cancelAdminAppt      = (data, token) => axios.post(`${BASE}/api/v1/admin/cancel-appointment`, data, { headers: { atoken: token } })
