import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import './ToastNotification.css';

const ToastContext = createContext();

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  /* `options` is optional and backwards compatible.
     Supported keys:
       action: { label, onClick } — renders a button inside the toast, for
               recoverable failures where the user can retry the operation
               that just failed instead of hunting for the control again. */
  const showToast = useCallback((message, type = 'info', duration = 3500, options = {}) => {
    const id = Date.now() + Math.random();
    const toast = { id, message, type, duration, action: options.action };

    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = useCallback((message, duration, options) => showToast(message, 'success', duration, options), [showToast]);
  const error = useCallback((message, duration, options) => showToast(message, 'error', duration, options), [showToast]);
  const info = useCallback((message, duration, options) => showToast(message, 'info', duration, options), [showToast]);
  const warning = useCallback((message, duration, options) => showToast(message, 'warning', duration, options), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast, success, error, info, warning }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container-luxury">
      {toasts.map((toast) => (
        <Toast key={toast.id} {...toast} onRemove={() => onRemove(toast.id)} />
      ))}
    </div>
  );
};

const Toast = ({ id, message, type, duration = 3500, action, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    /* Exit animation is 300ms, so start it early enough that the toast is
       gone exactly when the provider drops it from state. */
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(onRemove, 300);
    }, Math.max(0, duration - 300));

    return () => clearTimeout(timer);
  }, [onRemove, duration]);

  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: '💎'
  };

  const getTypeStyles = () => {
    switch (type) {
      case 'success':
        return 'toast-success';
      case 'error':
        return 'toast-error';
      case 'warning':
        return 'toast-warning';
      default:
        return 'toast-info';
    }
  };

  return (
    <div
      className={`toast-luxury ${getTypeStyles()} ${isExiting ? 'toast-exit' : ''}`}
      onClick={onRemove}
      role="alert"
      aria-live="polite"
    >
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-message">{message}</div>
      {action && (
        <button
          type="button"
          className="toast-action"
          /* stopPropagation: the toast body itself dismisses on click, which
             would otherwise swallow the action before it runs. */
          onClick={(e) => { e.stopPropagation(); action.onClick(); onRemove(); }}
        >
          {action.label}
        </button>
      )}
      <button className="toast-close" onClick={onRemove} aria-label="Close">
        ×
      </button>
    </div>
  );
};

export default ToastProvider;
