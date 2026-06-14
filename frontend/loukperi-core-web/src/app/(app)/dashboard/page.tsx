"use client";

import Link from "next/link";
import { useMemo } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import { useApiHealth } from "@/hooks/useApiHealth";
import { useAppSettings } from "@/hooks/useAppSettings";

type QuickAction = {
  title: string;
  description: string;
  href: string;
  icon: string;
};

type ActivityItem = {
  title: string;
  description: string;
  time: string;
  tone: "blue" | "green" | "amber";
};

const quickActions: QuickAction[] = [
  {
    title: "New Record",
    description: "Δημιουργία νέας demo εγγραφής.",
    href: "/records",
    icon: "📁",
  },
  {
    title: "New Task",
    description: "Δημιουργία νέας εργασίας.",
    href: "/tasks",
    icon: "✅",
  },
  {
    title: "Export Report",
    description: "Δημιουργία mock report export.",
    href: "/reports",
    icon: "📊",
  },
  {
    title: "Settings",
    description: "Ρυθμίσεις workspace και data source.",
    href: "/settings",
    icon: "⚙️",
  },
];

const activityItems: ActivityItem[] = [
  {
    title: "Records module updated",
    description: "Archive, restore, filters και empty states είναι ενεργά.",
    time: "Σήμερα",
    tone: "green",
  },
  {
    title: "Tasks module updated",
    description: "Το task flow έχει create, edit, archive, restore και delete.",
    time: "Σήμερα",
    tone: "blue",
  },
  {
    title: "Reports export mock flow",
    description: "Το export history κρατάει mock jobs στο localStorage.",
    time: "Σήμερα",
    tone: "amber",
  },
];

export default function DashboardPage() {
  const apiHealth = useApiHealth();
  const { settings } = useAppSettings();

  const apiStatusLabel = apiHealth.isChecking
    ? "Checking..."
    : apiHealth.isOnline
      ? "Online"
      : "Offline";

  const apiStatusTone = useMemo(() => {
    if (apiHealth.isChecking) return "blue";
    if (apiHealth.isOnline) return "green";
    return "red";
  }, [apiHealth.isChecking, apiHealth.isOnline]);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3A8DFF]">
              Dashboard
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              LoukPeri Core Overview
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Κεντρική εικόνα για records, tasks, reports, settings και
              backend connectivity. Το frontend είναι ακόμα σε demo/mock mode,
              αλλά πλέον ελέγχει και αν βλέπει το backend API.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatusBadge tone={apiStatusTone}>{apiStatusLabel}</StatusBadge>
            <StatusBadge
              tone={settings.dataSourceMode === "Mock" ? "blue" : "green"}
            >
              {settings.dataSourceMode}
            </StatusBadge>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Records</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">128</p>
          <p className="mt-2 text-sm text-slate-500">
            Demo records στο current workspace
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Tasks</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">34</p>
          <p className="mt-2 text-sm text-slate-500">
            Ενεργές και archived εργασίες
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Reports</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">8</p>
          <p className="mt-2 text-sm text-slate-500">
            Διαθέσιμα mock report templates
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
		  <div className="flex h-full flex-col justify-between gap-5">
			<div className="flex items-start justify-between gap-4">
			  <div>
				<p className="text-sm font-medium text-slate-500">Backend API</p>

				<p className="mt-3 text-2xl font-semibold text-slate-950">
				  {apiStatusLabel}
				</p>

				<p className="mt-2 text-sm text-slate-500">
				  {apiHealth.message}
				</p>

				{apiHealth.lastCheckedAt ? (
				  <p className="mt-2 text-xs text-slate-400">
					Last checked: {apiHealth.lastCheckedAt}
				  </p>
				) : null}
			  </div>

			  <StatusBadge tone={apiStatusTone}>{apiHealth.status}</StatusBadge>
			</div>

			<button
			  type="button"
			  onClick={apiHealth.recheck}
			  disabled={apiHealth.isChecking}
			  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600 transition hover:border-[#3A8DFF]/30 hover:bg-[#EEF6FF] hover:text-[#236fd1] disabled:cursor-not-allowed disabled:opacity-60"
			>
			  {apiHealth.isChecking ? "Checking..." : "Recheck API"}
			</button>
		  </div>
		</div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Business flow snapshot
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Mock εικόνα για το πώς δένουν τα βασικά modules της εφαρμογής.
              </p>
            </div>

            <StatusBadge tone="blue">Demo flow</StatusBadge>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-2xl">📁</div>
              <h3 className="mt-4 font-semibold text-slate-950">Records</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Κρατάνε τις βασικές επιχειρησιακές εγγραφές, με filters,
                archive και restore.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-2xl">✅</div>
              <h3 className="mt-4 font-semibold text-slate-950">Tasks</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Μετατρέπουν τα records σε ενέργειες, υπευθύνους και follow-up.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <div className="text-2xl">📊</div>
              <h3 className="mt-4 font-semibold text-slate-950">Reports</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Παράγουν mock exports και προετοιμάζουν το live reporting flow.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Current configuration
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Οι τιμές έρχονται από το Settings page.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Workspace
              </p>
              <p className="mt-2 font-semibold text-slate-950">
                {settings.workspaceName}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Company
              </p>
              <p className="mt-2 font-semibold text-slate-950">
                {settings.companyName}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Default export
              </p>
              <p className="mt-2 font-semibold text-slate-950">
                {settings.defaultExportFormat}
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Data source mode
              </p>
              <p className="mt-2 font-semibold text-slate-950">
                {settings.dataSourceMode}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Quick actions
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Γρήγορη μετάβαση στα βασικά modules.
          </p>

          <div className="mt-6 space-y-3">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-start gap-4 rounded-3xl border border-slate-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-[#3A8DFF]/30 hover:bg-[#EEF6FF]/50 hover:shadow-sm"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-xl">
                  {action.icon}
                </div>

                <div>
                  <p className="font-semibold text-slate-950">
                    {action.title}
                  </p>
                  <p className="mt-1 text-sm leading-5 text-slate-500">
                    {action.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Recent activity
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Mock activity feed για τα τελευταία frontend updates.
          </p>

          <div className="mt-6 space-y-4">
            {activityItems.map((item) => (
              <div
                key={item.title}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <StatusBadge tone={item.tone}>{item.time}</StatusBadge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}