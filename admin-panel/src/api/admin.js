import client from './client'

export const authApi = {
  requestOtp: (phone_number) =>
    client.post('/admin/auth/request-otp', { phone_number }),
  verifyOtp: (phone_number, otp) =>
    client.post('/admin/auth/verify-otp', { phone_number, otp }),
  me: () => client.get('/auth/me'),
}

export const adminApi = {
  overview: () => client.get('/admin/overview'),
  analytics: (days = 30) => client.get(`/admin/analytics?days=${days}`),
  activity: (limit = 50) => client.get(`/admin/activity?limit=${limit}`),

  users: (params = {}) => client.get('/admin/users', { params }),
  getUser: (id) => client.get(`/admin/users/${id}`),
  patchUser: (id, body) => client.patch(`/admin/users/${id}`, body),
  deleteUser: (id) => client.delete(`/admin/users/${id}`),
  userTasks: (id, limit = 100) => client.get(`/admin/users/${id}/tasks?limit=${limit}`),
  userNotes: (id, limit = 50) => client.get(`/admin/users/${id}/notes?limit=${limit}`),
  userSessions: (id, limit = 50) => client.get(`/admin/users/${id}/sessions?limit=${limit}`),
  userStats: (id, limit = 30) => client.get(`/admin/users/${id}/stats?limit=${limit}`),

  reportUsers: (params = {}) => client.get('/admin/reports/users', { params }),
}
