"use client";

import { ReactNode, useEffect } from "react";

type DetailDrawerProps = {
  open: boolean;
  eyebrow?: string;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
};

export default function DetailDrawer({
  open,
  eyebrow,
  title,
  description,
  children,
  footer,
  onClose,
}: DetailDrawerProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70]">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/35 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Κλείσιμο preview"
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-slate-200 bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              {eyebrow ? (
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3A8DFF]">
                  {eyebrow}
                </p>
              ) : null}

              <h2 className="mt-2 text-xl font-semibold text-slate-950">
                {title}
              </h2>

              {description ? (
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {description}
                </p>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
              aria-label="Κλείσιμο"
            >
              ×
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6">{children}</div>

        {footer ? (
          <div className="border-t border-slate-100 px-6 py-5">{footer}</div>
        ) : null}
      </aside>
    </div>
  );
}