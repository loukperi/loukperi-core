"use client";

import { useEffect, useState } from "react";
import AppButton from "@/components/ui/AppButton";
import { SelectInput, TextInput } from "@/components/ui/FormField";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/ToastProvider";
import {
  AppSettings,
  DataSourceMode,
  DefaultExportFormat,
  initialAppSettings,
  useAppSettings,
} from "@/hooks/useAppSettings";

export default function SettingsPage() {
  const { toast } = useToast();
  const { settings, setSettings } = useAppSettings();

  const [draft, setDraft] = useState<AppSettings>(settings);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  function updateDraft<K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleSaveSettings() {
    setSettings(draft);

    toast({
      title: "Settings saved",
      description: "Οι ρυθμίσεις αποθηκεύτηκαν προσωρινά στο frontend.",
      tone: "success",
    });
  }

  function handleResetSettings() {
    setDraft(initialAppSettings);
    setSettings(initialAppSettings);

    toast({
      title: "Settings reset",
      description: "Οι demo ρυθμίσεις επέστρεψαν στις αρχικές τιμές.",
      tone: "warning",
    });
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(draft);

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3A8DFF]">
              Settings
            </p>

            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Application Settings
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Κεντρικές ρυθμίσεις για workspace, χρήστη, exports και data
              source mode. Προς το παρόν αποθηκεύονται στο localStorage. Στο
              live στάδιο θα συνδεθούν με backend settings endpoints.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <StatusBadge
              tone={draft.dataSourceMode === "Mock" ? "blue" : "green"}
            >
              {draft.dataSourceMode}
            </StatusBadge>

            {hasChanges ? (
              <StatusBadge tone="amber">Unsaved changes</StatusBadge>
            ) : (
              <StatusBadge tone="green">Saved</StatusBadge>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Workspace</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {settings.workspaceName}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Current configured workspace
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Default Export</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {settings.defaultExportFormat}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Προεπιλεγμένη μορφή export
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Data Source</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {settings.dataSourceMode}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Τρέχουσα πηγή δεδομένων
          </p>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            Workspace settings
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Βασικά στοιχεία workspace και εταιρείας πελάτη.
          </p>

          <div className="mt-6 space-y-5">
            <TextInput
              label="Workspace name"
              value={draft.workspaceName}
              onChange={(event) =>
                updateDraft("workspaceName", event.target.value)
              }
              placeholder="Demo Workspace"
            />

            <TextInput
              label="Company name"
              value={draft.companyName}
              onChange={(event) =>
                updateDraft("companyName", event.target.value)
              }
              placeholder="Company name"
            />

            <SelectInput
              label="Data source mode"
              value={draft.dataSourceMode}
              onChange={(event) =>
                updateDraft(
                  "dataSourceMode",
                  event.target.value as DataSourceMode
                )
              }
              options={["Mock", "Backend API", "SQL Server Connector"]}
            />
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">
            User & export preferences
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Demo προτιμήσεις χρήστη και default μορφή export.
          </p>

          <div className="mt-6 space-y-5">
            <TextInput
              label="User name"
              value={draft.userName}
              onChange={(event) => updateDraft("userName", event.target.value)}
              placeholder="Admin User"
            />

            <TextInput
              label="User email"
              value={draft.userEmail}
              onChange={(event) => updateDraft("userEmail", event.target.value)}
              placeholder="admin@client.com"
            />

            <SelectInput
              label="Default export format"
              value={draft.defaultExportFormat}
              onChange={(event) =>
                updateDraft(
                  "defaultExportFormat",
                  event.target.value as DefaultExportFormat
                )
              }
              options={["XLSX", "CSV", "PDF"]}
            />
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Save changes
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Οι αλλαγές αποθηκεύονται προσωρινά στο localStorage.
            </p>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <AppButton variant="secondary" onClick={handleResetSettings}>
              Reset demo settings
            </AppButton>

            <AppButton onClick={handleSaveSettings} disabled={!hasChanges}>
              Save settings
            </AppButton>
          </div>
        </div>
      </section>
    </div>
  );
}