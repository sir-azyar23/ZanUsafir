import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Deduplication flag: prevent multiple parallel 401 responses from firing
// multiple logout events simultaneously (e.g. Promise.all with several requests).
let _logoutPending = false;

// Handle 401 globally — but NOT for:
//   • the login endpoint itself (avoids clearing tokens on bad credentials)
//   • 403 Forbidden responses (user is authenticated but lacks permission;
//     the token is valid, so we must NOT log them out)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const isLoginRequest = err.config?.url === '/auth/login';
    const hadAuthHeader = Boolean(err.config?.headers?.Authorization);

    // 403 = token is valid, user simply lacks the required role → do NOT logout
    if (status === 403) {
      return Promise.reject(err);
    }

    // 401 = token is missing, expired, or invalid → force logout once
    if (status === 401 && !isLoginRequest && hadAuthHeader && !_logoutPending) {
      _logoutPending = true;
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.dispatchEvent(new CustomEvent('auth:logout'));
      // Reset after a short delay so future genuine 401s still trigger logout
      setTimeout(() => { _logoutPending = false; }, 3000);
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────
export const login = (data) => api.post('/auth/login', data);
export const register = (data) => api.post('/auth/register', data);
export const getMe = () => api.get('/auth/me');
export const getProfile = () => api.get('/auth/profile');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (data) => api.post('/auth/change-password', data);

// ── Users (Admin) ─────────────────────────────────────────
export const getUsers = () => api.get('/users');
export const updateUser = (id, data) => api.put(`/users/${id}`, data);
export const deleteUser = (id) => api.delete(`/users/${id}`);
export const toggleUserActive = (id) => api.patch(`/users/${id}/toggle-active`);

// ── Routes ────────────────────────────────────────────────
export const getRoutes = (search) => api.get('/routes', { params: search ? { search } : {} });
export const getRoute = (id) => api.get(`/routes/${id}`);
export const createRoute = (data) => api.post('/routes', data);
export const updateRoute = (id, data) => api.put(`/routes/${id}`, data);
export const updateRouteSettings = (id, data) => api.put(`/routes/${id}/settings`, data);
export const getRouteSettings = (id) => api.get(`/routes/${id}/settings`);
export const assignBusesToRoute = (routeId, busIds) => api.post(`/routes/${routeId}/assign-buses`, busIds);
export const getAssignedBusesCount = (routeId) => api.get(`/routes/${routeId}/buses/count`);
export const getBusStopsCount = (routeId) => api.get(`/routes/${routeId}/stops/count`);
export const deleteRoute = (id) => api.delete(`/routes/${id}`);
export const addStop = (routeId, stopId, order, mapX = null, mapY = null) =>
  api.post(`/routes/${routeId}/stops`, null, {
    params: {
      stopId,
      order,
      ...(mapX != null ? { mapX } : {}),
      ...(mapY != null ? { mapY } : {}),
    },
  });
export const updateRouteStop = (routeId, routeStopId, data) =>
  api.put(`/routes/${routeId}/stops/${routeStopId}`, null, { params: data });
export const removeStop = (routeId, routeStopId) =>
  api.delete(`/routes/${routeId}/stops/${routeStopId}`);

// ── Bus Stops ─────────────────────────────────────────────
export const getBusStops = (search) => api.get('/stops', { params: search ? { search } : {} });
export const getBusStop = (id) => api.get(`/stops/${id}`);
export const createBusStop = (data) => api.post('/stops', data);
export const updateBusStop = (id, data) => api.put(`/stops/${id}`, data);
export const deleteBusStop = (id) => api.delete(`/stops/${id}`);

// ── Buses ─────────────────────────────────────────────────
export const getBuses = (routeId) => api.get('/buses', { params: routeId ? { routeId } : {} });
export const getBus = (id) => api.get(`/buses/${id}`);
export const createBus = (data) => api.post('/buses', data);
export const updateBus = (id, data) => api.put(`/buses/${id}`, data);
export const deleteBus = (id) => api.delete(`/buses/${id}`);

// ── Drivers ───────────────────────────────────────────────
export const getDrivers = () => api.get('/drivers');
export const getDriver = (id) => api.get(`/drivers/${id}`);
export const createDriver = (data) => api.post('/drivers', data);
export const updateDriver = (id, data) => api.put(`/drivers/${id}`, data);
export const deleteDriver = (id) => api.delete(`/drivers/${id}`);

// ── Fares ─────────────────────────────────────────────────
export const getFares = (routeId) => api.get('/fares', { params: routeId ? { routeId } : {} });
export const createFare = (data) => api.post('/fares', data);
export const updateFare = (id, data) => api.put(`/fares/${id}`, data);
export const deleteFare = (id) => api.delete(`/fares/${id}`);

// ── Generated Routes ────────────────────────────────────────
export const getGeneratedRoutes = (routeId, status) => api.get('/generated-routes', {
  params: {
    ...(routeId ? { routeId } : {}),
    ...(status ? { status } : {}),
  },
});
export const getGeneratedRoute = (id) => api.get(`/generated-routes/${id}`);
export const createGeneratedRoute = (data) => api.post('/generated-routes', data);
export const approveGeneratedRoute = (id, comment) => api.patch(`/generated-routes/${id}/approve`, { comment });
export const activateGeneratedRoute = (id, comment) => api.patch(`/generated-routes/${id}/activate`, { comment });
export const rejectGeneratedRoute = (id, comment) => api.patch(`/generated-routes/${id}/reject`, { comment });

// ── Audit Logs ────────────────────────────────────────────
export const getAuditLogs = (params) => api.get('/audit-logs', { params });

// ── Tickets ───────────────────────────────────────────────────────────────
export const getMyTickets = () => api.get('/tickets/mine');
export const getAllTickets = (params) => api.get('/tickets', { params });
export const getTicketSalesSummary = () => api.get('/tickets/summary');
export const exportTicketSalesReport = (params) => api.get('/tickets/export', { params, responseType: 'blob' });
export const getTicket = (id) => api.get(`/tickets/${id}`);
export const purchaseTicket = (data) => api.post('/tickets', data);
export const purchaseTicketPublic = (data) => api.post('/tickets/public', data);
export const getTicketFare = (routeId, passengerType) =>
  api.get('/tickets/fare', { params: { routeId, passengerType } });
export const verifyTicketQr = (qrToken) => api.post('/tickets/verify', { qrToken });
export const cancelTicket = (id, reason) => api.patch(`/tickets/${id}/cancel`, { reason });

// Legacy aliases
export const bookTicket = purchaseTicket;
export const bookTicketPublic = purchaseTicketPublic;

// ── Notifications ─────────────────────────────────────────
export const getNotifications = (page = 0, size = 20) =>
  api.get('/notifications', { params: { page, size } });
export const getUnreadCount = () => api.get('/notifications/unread-count');
export const markNotificationRead = (id) => api.patch(`/notifications/${id}/read`);
export const markAllNotificationsRead = () => api.patch('/notifications/mark-all-read');
export const deleteNotification = (id) => api.delete(`/notifications/${id}`);
export const clearAllNotifications = () => api.delete('/notifications/clear-all');

export default api;
