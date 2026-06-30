import axios from "axios"
const BASE = import.meta.env.VITE_BACKEND_URL

export const loginDoctor          = (data)        => axios.post(`${BASE}/api/v1/doctors/login`, data)
export const getDoctors           = ()             => axios.get(`${BASE}/api/v1/doctors/list`)
export const getDoctorProfile     = (token)        => axios.get(`${BASE}/api/v1/doctors/profile`, { headers: { dtoken: token } })
export const updateDoctorProfile  = (data, token)  => axios.post(`${BASE}/api/v1/doctors/update-profile`, data, { headers: { dtoken: token } })
export const getDoctorDashboard   = (token)        => axios.get(`${BASE}/api/v1/doctors/dashboard`, { headers: { dtoken: token } })
export const getDoctorAppointments= (token)        => axios.get(`${BASE}/api/v1/doctors/appointments`, { headers: { dtoken: token } })
export const completeAppointment  = (data, token)  => axios.post(`${BASE}/api/v1/doctors/complete-appointment`, data, { headers: { dtoken: token } })
export const cancelDoctorAppt     = (data, token)  => axios.post(`${BASE}/api/v1/doctors/cancel-appointment`, data, { headers: { dtoken: token } })
