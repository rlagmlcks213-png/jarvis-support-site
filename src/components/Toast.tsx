"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500);
  }, []);

  const color: Record<ToastType, string> = {
    success: "bg-emerald-600",
    error: "bg-red-600",
    info: "bg-slate-800",
  };

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[100] flex flex-col items-center gap-2 px-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`animate-toast-in pointer-events-auto max-w-md rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-lg ${color[t.type]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
