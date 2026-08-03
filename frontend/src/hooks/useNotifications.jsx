import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from '../services/api';
import { useAuth } from './useAuth';

const NotificationContext = createContext(null);

const POLL_INTERVAL_MS = 30_000; // poll every 30 seconds

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const intervalRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const { data } = await getUnreadCount();
      setUnreadCount(data.count ?? 0);
    } catch {
      // swallow — backend may not be running
    }
  }, [user]);

  const fetchNotifications = useCallback(async (pageNum = 0) => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await getNotifications(pageNum, 20);
      const items = data.content ?? [];
      setNotifications(pageNum === 0 ? items : prev => [...prev, ...items]);
      setTotalPages(data.totalPages ?? 1);
      setPage(pageNum);
      // also sync unread count from fetched data
      setUnreadCount(items.filter(n => !n.isRead).length +
        (pageNum > 0 ? unreadCount : 0));
    } catch {
      // swallow
    } finally {
      setLoading(false);
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load + polling for unread count
  useEffect(() => {
    if (!user) return;
    fetchNotifications(0);
    fetchUnreadCount();

    intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [user, fetchNotifications, fetchUnreadCount]);

  const markRead = useCallback(async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {/* swallow */}
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {/* swallow */}
  }, []);

  const deleteOne = useCallback(async (id) => {
    const wasUnread = notifications.find(n => n.id === id)?.isRead === false;
    try {
      await deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
      if (wasUnread) setUnreadCount(prev => Math.max(0, prev - 1));
    } catch {/* swallow */}
  }, [notifications]);

  const clearAll = useCallback(async () => {
    try {
      await clearAllNotifications();
      setNotifications([]);
      setUnreadCount(0);
    } catch {/* swallow */}
  }, []);

  const loadMore = useCallback(() => {
    if (page + 1 < totalPages) fetchNotifications(page + 1);
  }, [page, totalPages, fetchNotifications]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      hasMore: page + 1 < totalPages,
      refresh: () => fetchNotifications(0),
      markRead,
      markAllRead,
      deleteOne,
      clearAll,
      loadMore,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
