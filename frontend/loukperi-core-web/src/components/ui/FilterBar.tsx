"use client";

import { ReactNode } from "react";

type FilterOption = {
  label: string;
  value: string;
};

type SelectFilter = {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
};

type FilterBarProps = {
  searchValue: string;
  searchPlaceholder?: string;
  onSearchChange: (value: string) => void;
  filters?: SelectFilter[];
  rightSlot?: ReactNode;
};

export default function FilterBar({
  searchValue,
  searchPlaceholder = "Search...",
  onSearchChange,
  filters = [],
  rightSlot,
}: FilterBarProps) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-3 md:flex-row">
          <div className="relative flex-1">
            <input
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 pl-10 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#3A8DFF] focus:bg-white focus:ring-4 focus:ring-[#3A8DFF]/10"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400">
              ⌕
            </span>
          </div>

          {filters.map((filter) => (
            <label key={filter.label} className="min-w-[180px]">
              <select
                value={filter.value}
                onChange={(event) => filter.onChange(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 outline-none transition focus:border-[#3A8DFF] focus:bg-white focus:ring-4 focus:ring-[#3A8DFF]/10"
                aria-label={filter.label}
              >
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        {rightSlot ? <div className="flex shrink-0 gap-3">{rightSlot}</div> : null}
      </div>
    </section>
  );
}