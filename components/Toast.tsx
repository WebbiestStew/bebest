'use client';

import { useEffect, useRef, useState } from 'react';

interface ToastItem {
  id: string;
  message: string;
  isError: boolean;
  leaving?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  duration: number;
}

export function Toast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  // Tracks each toast's exit/removal timers so an action click can cancel
  // them instead of racing the auto-dismiss into a double-removal.
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>[]>>({});

  const dismiss = (id: string) => {
    (timersRef.current[id] || []).forEach(clearTimeout);
    delete timersRef.current[id];
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const handleShowToast = (event: any) => {
      const { message, isError, actionLabel, onAction, duration } = event.detail;
      const id = Date.now().toString() + Math.random().toString(36).slice(2);
      // Toasts with an undo-style action get more time on screen by default —
      // 3s isn't enough to read a message and decide whether to act on it.
      const effectiveDuration = duration ?? (actionLabel ? 6000 : 3200);

      setToasts((prev) => [...prev, { id, message, isError: !!isError, actionLabel, onAction, duration: effectiveDuration }]);

      const exitTimer = setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      }, effectiveDuration);
      const removeTimer = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        delete timersRef.current[id];
      }, effectiveDuration + 300);

      timersRef.current[id] = [exitTimer, removeTimer];
    };

    window.addEventListener('showToast', handleShowToast);
    return () => window.removeEventListener('showToast', handleShowToast);
  }, []);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-sm px-5 py-3 rounded-lg text-sm text-white shadow-lg transition-all duration-300 flex items-center gap-4 ${
            toast.leaving ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0 animate-slide-up-fade'
          } ${toast.isError ? 'bg-red' : 'bg-ink'}`}
        >
          <span className="text-center flex-1">{toast.message}</span>
          {toast.actionLabel && (
            <button
              onClick={() => {
                toast.onAction?.();
                dismiss(toast.id);
              }}
              className="shrink-0 font-semibold underline underline-offset-2 hover:text-sage-pale transition-colors duration-150"
            >
              {toast.actionLabel}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
