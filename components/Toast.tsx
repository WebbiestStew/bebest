'use client';

import { useEffect, useState } from 'react';

export function Toast() {
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; isError: boolean; leaving?: boolean }>>([]);

  useEffect(() => {
    const handleShowToast = (event: any) => {
      const { message, isError } = event.detail;
      const id = Date.now().toString();

      setToasts((prev) => [...prev, { id, message, isError }]);

      // Start exit animation, then remove from DOM
      setTimeout(() => {
        setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
      }, 2900);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3200);
    };

    window.addEventListener('showToast', handleShowToast);
    return () => window.removeEventListener('showToast', handleShowToast);
  }, []);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-3">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`max-w-xs px-5 py-3 rounded-lg text-sm text-center text-white shadow-lg transition-all duration-300 ${
            toast.leaving ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0 animate-slide-up-fade'
          } ${toast.isError ? 'bg-red' : 'bg-ink'}`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
