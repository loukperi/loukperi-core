import { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
};

export default function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: PageHeaderProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          {eyebrow ? (
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#3A8DFF]">
              {eyebrow}
            </p>
          ) : null}

          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {title}
          </h2>

          {description ? (
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          ) : null}
        </div>

        {actions ? <div className="flex shrink-0 gap-3">{actions}</div> : null}
      </div>
    </section>
  );
}