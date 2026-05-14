import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Muscle groups
export const getMuscleGroups = () => api.get('/muscle-groups').then(r => r.data)

// Calendar
export const getCalendar = (year, month) =>
  api.get('/workouts/calendar', { params: { year, month } }).then(r => r.data)

// History
export const getHistory = () => api.get('/workouts/history').then(r => r.data)

// Session by date
export const getSessionByDate = (date) =>
  api.get(`/workouts/${date}`).then(r => r.data).catch(e => {
    if (e.response?.status === 404) return null
    throw e
  })

// Create session
export const createSession = (date, notes = '') =>
  api.post('/workouts', { date, notes }).then(r => r.data)

// Delete session
export const deleteSession = (sessionId) =>
  api.delete(`/workouts/${sessionId}`).then(r => r.data)

// Add set
export const addSet = (sessionId, payload) =>
  api.post(`/workouts/${sessionId}/sets`, payload).then(r => r.data)

// Update set
export const updateSet = (setId, payload) =>
  api.put(`/workouts/sets/${setId}`, payload).then(r => r.data)

// Delete set
export const deleteSet = (setId) =>
  api.delete(`/workouts/sets/${setId}`).then(r => r.data)

export default api
