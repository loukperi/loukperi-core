type StatusBadgeTone = "blue" | "green" | "amber" | "slate" | "red";

type StatusBadgeProps = {
  children: string;
  tone?: StatusBadgeTone;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  blue: "border-[#3A8DFF]/20 bg-[#EEF6FF] text-[#236fd1]",
  green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  amber: "border-amber-200 bg-amber-50 text-amber-700",
  slate: "border-slate-200 bg-slate-50 text-slate-600",
  red: "border-red-200 bg-red-50 text-red-700",
};

export default function StatusBadge({
  children,
  tone = "slate",
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
        toneClasses[tone],
      ].join(" ")}
    >
      {children}
    </span>
  );
}