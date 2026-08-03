import { createContext, useContext, useState, useCallback, useRef } from 'react';

/**
 * Single global toast system.
 *
 * Types:
 *   'login'   – blue, animated checkmark, shimmer bar — clears when dashboard data loads
 *   'logout'  – blue, logout icon, shimmer bar       — clears when login page mounts
 *   'loading' – blue, spinner, shimmer bar           — clears manually via hideToast()
 *   'success' – blue, checkmark, fill bar            — auto-dismisses after `duration`
 *   'error'   – red,  X icon,   fill bar             — auto-dismisses after `duration`
 *
 * Usage:
 *   const { showToast, hideToast } = useToast();
 *   showToast({ type: 'success', title: 'Saved!', message: 'Route was created.' });
 *   showToast({ type: 'loading', title: 'Saving...', message: 'Please wait.' });
 *   hideToast();   // called by destination page after it finishes loading
 */

const ToastContext = createContext(null);

const EMPTY = {
  active:   false,
  type:     null,   // 'login' | 'logout' | 'loading' | 'success' | 'error'
  title:    '',
  message:  '',
  name:     '',     // used by 'login' for "Welcome back, {name}!"
  duration: null,   // ms — if set, auto-dismiss; if null, manual dismiss only
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(EMPTY);
  const timerRef = useRef(null);

  const showToast = useCallback((config) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const nextToast = { ...EMPTY, duration: 3000, active: true, ...config };
    setToast(nextToast);
    if (nextToast.duration) {
      timerRef.current = setTimeout(() => setToast(EMPTY), nextToast.duration);
    }
  }, []);

  const hideToast = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast(EMPTY);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
