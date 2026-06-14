type StatCardProps = {
  label: string;
  value: string | number;
  description?: string;
  badge?: string;
};

export default function StatCard({
  label,
  value,
  description,
  badge,
}: StatCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm font-medium text-slate-500">{label}</p>

        {badge ? (
          <span className="rounded-full border border-[#3A8DFF]/20 bg-[#EEF6FF] px-3 py-1 text-xs font-semibold text-[#236fd1]">
            {badge}
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>

      {description ? (
        <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
      ) : null}
    </div>
  );
}