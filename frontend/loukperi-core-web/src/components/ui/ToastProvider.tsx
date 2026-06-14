"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type ToastTone = "success" | "info" | "warning" | "error";

type ToastInput = {
  title: string;
  description?: string;
  tone?: ToastTone;
};

type ToastItem = ToastInput & {
  id: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (input: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toneClasses: Record<ToastTone, string> = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-[#3A8DFF]/20 bg-[#EEF6FF] text-[#236fd1]",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

const toneIcon: Record<ToastTone, string> = {
  success: "✓",
  info: "i",
  warning: "!",
  error: "×",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const toast = useCallback(
    (input: ToastInput) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;

      const nextToast: ToastItem = {
        id,
        title: input.title,
        description: input.description,
        tone: input.tone ?? "success",
      };

      setToasts((current) => [nextToast, ...current].slice(0, 4));

      window.setTimeout(() => {
        removeToast(id);
      }, 3500);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="fixed right-4 top-4 z-[120] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3 sm:right-6 sm:top-6">
        {toasts.map((item) => (
          <div
            key={item.id}
            className={[
              "overflow-hidden rounded-3xl border p-4 shadow-xl backdrop-blur-xl",
              toneClasses[item.tone],
            ].join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-sm font-bold shadow-sm">
                {toneIcon[item.tone]}
              </div>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{item.title}</p>

                {item.description ? (
                  <p className="mt-1 text-sm leading-5 opacity-80">
                    {item.description}
                  </p>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="rounded-xl px-2 py-1 text-sm font-semibold opacity-60 transition hover:bg-white/50 hover:opacity-100"
                aria-label="Κλείσιμο ειδοποίησης"
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}