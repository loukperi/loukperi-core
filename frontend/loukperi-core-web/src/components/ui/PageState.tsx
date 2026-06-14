"use client";

import AppButton from "@/components/ui/AppButton";

type PageStateTone = "empty" | "loading" | "error" | "success";

type PageStateProps = {
  tone?: PageStateTone;
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

const toneClasses: Record<PageStateTone, string> = {
  empty: "border-slate-200 bg-white text-slate-600",
  loading: "border-blue-100 bg-[#EEF6FF] text-slate-700",
  error: "border-red-100 bg-red-50 text-red-700",
  success: "border-emerald-100 bg-emerald-50 text-emerald-700",
};

const defaultIcon: Record<PageStateTone, string> = {
  empty: "📭",
  loading: "⏳",
  error: "⚠️",
  success: "✅",
};

export default function PageState({
  tone = "empty",
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: PageStateProps) {
  return (
    <div
      className={[
        "rounded-3xl border p-8 text-center shadow-sm",
        toneClasses[tone],
      ].join(" ")}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-white text-2xl shadow-sm">
        {icon ?? defaultIcon[tone]}
      </div>

      <h3 className="mt-5 text-lg font-semibold text-slate-950">{title}</h3>

      {description ? (
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
          {description}
        </p>
      ) : null}

      {actionLabel && onAction ? (
        <div className="mt-6 flex justify-center">
          <AppButton variant="secondary" onClick={onAction}>
            {actionLabel}
          </AppButton>
        </div>
      ) : null}
    </div>
  );
}