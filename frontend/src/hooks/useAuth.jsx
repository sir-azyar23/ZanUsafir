import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { login as apiLogin } from '../services/api';

const AuthContext = createContext(null);

function getStoredUser() {
  const token = localStorage.getItem('token');
  if (!token) {
    localStorage.removeItem('user');
    localStorage.removeItem('refreshToken');
    return null;
  }

  try {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    return null;
  }
}

function clearStoredAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(getStoredUser);
  const [loading] = useState(false);
  const navigate = useNavigate();

  const logout = useCallback(() => {
    clearStoredAuth();
    setUser(null);
    navigate('/login', { replace: true });
  }, [navigate]);

  // Clears auth data immediately without navigating — used by logout overlay
  const clearAuth = useCallback(() => {
    clearStoredAuth();
    setUser(null);
  }, []);

  // Listen for forced logout events from the API interceptor
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, [logout]);

  const login = async (credentials) => {
    const { data } = await apiLogin(credentials);
    localStorage.setItem('token', data.token);
    if (data.refreshToken) localStorage.setItem('refreshToken', data.refreshToken);
    localStorage.setItem('user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const updateUser = (partialData) => {
    const updated = { ...user, ...partialData };
    localStorage.setItem('user', JSON.stringify(updated));
    setUser(updated);
  };

  const isAdmin = () => user?.role === 'ADMIN';
  const isTransportOfficer = () => user?.role === 'TRANSPORT_OFFICER';

  return (
    <AuthContext.Provider value={{
      user, login, logout, clearAuth,
      updateUser, loading, isAdmin, isTransportOfficer,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
