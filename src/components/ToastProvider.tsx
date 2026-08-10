"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastType = "success" | "error" | "info";

interface ToastItem {
  id: number;
  type: ToastType;
  text: string;
}

interface ConfirmOptions {
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

interface ToastContextValue {
  toast: {
    success: (text: string) => void;
    error: (text: string) => void;
    info: (text: string) => void;
  };
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

const TOAST_STYLES: Record<ToastType, { icon: React.ReactNode; accent: string; bar: string }> = {
  success: {
    icon: <CheckCircle2 size={18} />,
    accent: "text-green-400 border-green-500/30 bg-green-500/10",
    bar: "bg-green-400",
  },
  error: {
    icon: <XCircle size={18} />,
    accent: "text-red-400 border-red-500/30 bg-red-500/10",
    bar: "bg-red-400",
  },
  info: {
    icon: <Info size={18} />,
    accent: "text-primary border-primary/30 bg-primary/10",
    bar: "bg-primary",
  },
};

const ToastCard = ({
  toast,
  onDismiss,
}: {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}) => {
  const style = TOAST_STYLES[toast.type];
  return (
    <div
      className="pointer-events-auto flex items-start gap-3 rounded-xl border bg-[#11161c]/95 p-3.5 shadow-2xl backdrop-blur-sm"
      style={{ animation: "toast-in 0.25s ease-out" }}
    >
      <span className={`shrink-0 rounded-full border p-1.5 ${style.accent}`}>{style.icon}</span>
      <p className="flex-1 text-sm text-gray-200 break-words leading-relaxed">{toast.text}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 p-1 text-gray-500 hover:text-white hover:bg-transparent hover:shadow-none"
        aria-label="Dismiss"
      >
        <X size={16} />
      </button>
      <span className={`absolute left-0 top-0 h-full w-1 rounded-l-xl ${style.bar}`} />
    </div>
  );
};

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, text: string) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-4), { id, type, text }]);
      setTimeout(() => dismiss(id), 4500);
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (text: string) => push("success", text),
      error: (text: string) => push("error", text),
      info: (text: string) => push("info", text),
    }),
    [push]
  );

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setConfirmState({ ...options, resolve });
      }),
    []
  );

  const handleConfirm = (value: boolean) => {
    confirmState?.resolve(value);
    setConfirmState(null);
  };

  return (
    <ToastContext.Provider value={{ toast, confirm }}>
      {children}

      {/* Toast stack */}
      <div className="pointer-events-none fixed top-20 right-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3">
        {toasts.map((t) => (
          <div key={t.id} className="relative">
            <ToastCard toast={t} onDismiss={dismiss} />
          </div>
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => handleConfirm(false)}
          />
          <div
            className="relative w-full max-w-md rounded-xl border border-gray-700 bg-gray-800 p-6 shadow-2xl"
            style={{ animation: "toast-in 0.2s ease-out" }}
          >
            <div className="mb-4 flex items-start gap-4">
              <span
                className={`shrink-0 rounded-full border p-2.5 ${
                  confirmState.danger
                    ? "border-red-500/30 bg-red-500/10 text-red-400"
                    : "border-primary/30 bg-primary/10 text-primary"
                }`}
              >
                {confirmState.danger ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
              </span>
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-white">
                  {confirmState.title || (confirmState.danger ? "Are you sure?" : "Confirm action")}
                </h3>
                <div className="mt-1 text-sm text-gray-400 leading-relaxed break-words">
                  {confirmState.message}
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirm(false)}
                className="flex-1 rounded-lg bg-gray-700 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-gray-600"
              >
                {confirmState.cancelLabel || "Cancel"}
              </button>
              <button
                onClick={() => handleConfirm(true)}
                className={`flex-1 rounded-lg px-4 py-2.5 font-semibold text-white transition-colors ${
                  confirmState.danger
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-primary text-black hover:brightness-110"
                }`}
              >
                {confirmState.confirmLabel || "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
};
