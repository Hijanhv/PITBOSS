"use client";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { explorerTx } from "@/lib/config";
import { truncate } from "@/lib/format";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
  hash?: string;
}

interface ToastApi {
  push: (t: Omit<Toast, "id">) => void;
  success: (title: string, opts?: { message?: string; hash?: string }) => void;
  error: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const push = useCallback(
    (t: Omit<Toast, "id">) => {
      const id = Date.now() + Math.random();
      setToasts((cur) => [...cur, { ...t, id }]);
      setTimeout(() => remove(id), 6500);
    },
    [remove],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, opts) =>
        push({ kind: "success", title, message: opts?.message, hash: opts?.hash }),
      error: (title, message) => push({ kind: "error", title, message }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto w-full max-w-sm animate-slide-in rounded-xl border p-3.5 shadow-xl backdrop-blur-md ${
              t.kind === "success"
                ? "border-yes/30 bg-yes/10"
                : t.kind === "error"
                  ? "border-no/30 bg-no/10"
                  : "border-white/10 bg-pit-850/90"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-zinc-100">{t.title}</p>
                {t.message && (
                  <p className="mt-0.5 text-xs text-zinc-400">{t.message}</p>
                )}
                {t.hash && (
                  <a
                    href={explorerTx(t.hash)}
                    target="_blank"
                    rel="noreferrer"
                    className="tabnum mt-1 inline-block text-xs text-boss hover:text-boss-bright"
                  >
                    {truncate(t.hash, 8, 8)} ↗
                  </a>
                )}
              </div>
              <button
                onClick={() => remove(t.id)}
                className="text-zinc-500 transition hover:text-zinc-200"
                aria-label="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
