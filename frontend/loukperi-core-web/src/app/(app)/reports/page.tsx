"use client";

import { useEffect, useMemo, useState } from "react";
import DataTable, { DataTableColumn } from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import { useToast } from "@/components/ui/ToastProvider";
import { useAppSettings } from "@/hooks/useAppSettings";
import PageState from "@/components/ui/PageState";

type ReportType = "Records" | "Tasks" | "Operations" | "Finance";
type ExportFormat = "XLSX" | "CSV" | "PDF";
type ExportStatus = "Ready" | "Processing" | "Failed";

type ReportTemplate = {
  id: string;
  name: string;
  type: ReportType;
  description: string;
  rows: number;
  lastRun: string;
};

type ExportJob = {
  id: string;
  reportName: string;
  reportType: ReportType;
  format: ExportFormat;
  status: ExportStatus;
  requestedBy: string;
  createdAt: string;
  rows: number;
  note: string;
};

const reportTemplates: ReportTemplate[] = [
  {
    id: "records-summary",
    name: "Records Summary",
    type: "Records",
    description: "Σύνοψη ενεργών και archived records ανά status και τύπο.",
    rows: 128,
    lastRun: "Σήμερα",
  },
  {
    id: "tasks-overview",
    name: "Tasks Overview",
    type: "Tasks",
    description: "Επισκόπηση tasks ανά status, priority και owner.",
    rows: 34,
    lastRun: "Σήμερα",
  },
  {
    id: "operations-flow",
    name: "Operations Flow",
    type: "Operations",
    description: "Mock operational report για business process flow.",
    rows: 86,
    lastRun: "Χθες",
  },
  {
    id: "finance-export",
    name: "Finance Export",
    type: "Finance",
    description: "Mock οικονομικό export για μελλοντική σύνδεση με ERP data.",
    rows: 42,
    lastRun: "Πριν 2 ημέρες",
  },
];

const initialExportJobs: ExportJob[] = [
  {
    id: "EXP-2026-003",
    reportName: "Records Summary",
    reportType: "Records",
    format: "XLSX",
    status: "Ready",
    requestedBy: "Admin User",
    createdAt: "24/05/2026, 09:30",
    rows: 128,
    note: "Mock export ολοκληρώθηκε.",
  },
  {
    id: "EXP-2026-002",
    reportName: "Tasks Overview",
    reportType: "Tasks",
    format: "CSV",
    status: "Ready",
    requestedBy: "Admin User",
    createdAt: "23/05/2026, 18:10",
    rows: 34,
    note: "Mock export ολοκληρώθηκε.",
  },
];

function getNowLabel() {
  return new Intl.DateTimeFormat("el-GR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date());
}

function getStatusTone(status: ExportStatus) {
  if (status === "Ready") return "green";
  if (status === "Processing") return "blue";
  return "red";
}

function getTypeTone(type: ReportType) {
  if (type === "Records") return "blue";
  if (type === "Tasks") return "amber";
  if (type === "Operations") return "green";
  return "red";
}

export default function ReportsPage() {
  const { toast } = useToast();
  const { settings } = useAppSettings();

  const [exportJobs, setExportJobs] = useLocalStorageState<ExportJob[]>(
    "loukperi_demo_report_exports",
    initialExportJobs
  );

  const [typeFilter, setTypeFilter] = useState<"all" | ReportType>("all");
  const [format, setFormat] = useState<ExportFormat>( settings.defaultExportFormat);
  useEffect(() => {
  setFormat(settings.defaultExportFormat);
  }, [settings.defaultExportFormat]);
  const [processingReportId, setProcessingReportId] = useState<string | null>(
    null
  );

  const visibleTemplates = useMemo(() => {
    if (typeFilter === "all") {
      return reportTemplates;
    }

    return reportTemplates.filter((template) => template.type === typeFilter);
  }, [typeFilter]);

  const readyExports = useMemo(
    () => exportJobs.filter((job) => job.status === "Ready"),
    [exportJobs]
  );

  const processingExports = useMemo(
    () => exportJobs.filter((job) => job.status === "Processing"),
    [exportJobs]
  );

  const failedExports = useMemo(
    () => exportJobs.filter((job) => job.status === "Failed"),
    [exportJobs]
  );

  const exportColumns: DataTableColumn<ExportJob>[] = [
    {
      header: "Export ID",
      cell: (row) => (
        <span className="font-semibold text-slate-950">{row.id}</span>
      ),
    },
    {
      header: "Report",
      cell: (row) => (
        <div>
          <p className="font-medium text-slate-950">{row.reportName}</p>
          <p className="mt-1 text-xs text-slate-500">{row.note}</p>
        </div>
      ),
    },
    {
      header: "Type",
      cell: (row) => (
        <StatusBadge tone={getTypeTone(row.reportType)}>
          {row.reportType}
        </StatusBadge>
      ),
    },
    {
      header: "Format",
      cell: (row) => (
        <span className="rounded-2xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
          {row.format}
        </span>
      ),
    },
    {
      header: "Status",
      cell: (row) => (
        <StatusBadge tone={getStatusTone(row.status)}>
          {row.status}
        </StatusBadge>
      ),
    },
    {
      header: "Rows",
      cell: (row) => <span>{row.rows.toLocaleString("el-GR")}</span>,
    },
    {
      header: "Created",
      cell: (row) => <span className="text-slate-500">{row.createdAt}</span>,
    },
  ];

  function handleExport(template: ReportTemplate) {
    if (processingReportId) return;

    const exportId = `EXP-${Date.now()}`;

    const processingJob: ExportJob = {
      id: exportId,
      reportName: template.name,
      reportType: template.type,
      format,
      status: "Processing",
      requestedBy: "Admin User",
      createdAt: getNowLabel(),
      rows: template.rows,
      note: "Το export δημιουργείται προσωρινά στο frontend.",
    };

    setProcessingReportId(template.id);
    setExportJobs((current) => [processingJob, ...current]);

    toast({
      title: "Export started",
      description: `${template.name} ξεκίνησε σε μορφή ${format}.`,
      tone: "info",
    });

    window.setTimeout(() => {
      setExportJobs((current) =>
        current.map((job) =>
          job.id === exportId
            ? {
                ...job,
                status: "Ready",
                note: "Mock export ολοκληρώθηκε. Στο live στάδιο θα συνδεθεί με backend αρχείο.",
              }
            : job
        )
      );

      setProcessingReportId(null);

      toast({
        title: "Export ready",
        description: `${template.name} είναι έτοιμο ως mock ${format} export.`,
        tone: "success",
      });
    }, 1200);
  }

  function handleClearHistory() {
    setExportJobs([]);

    toast({
      title: "Export history cleared",
      description: "Το mock ιστορικό exports καθαρίστηκε.",
      tone: "warning",
    });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#3A8DFF]">
              Reports
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
              Export Center
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
              Mock export flow για reports. Προς το παρόν δημιουργεί export
              entries στο frontend/localStorage. Στο live στάδιο θα συνδεθεί με
              backend endpoints και πραγματικό XLSX/CSV/PDF αρχείο.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={typeFilter}
              onChange={(event) =>
                setTypeFilter(event.target.value as "all" | ReportType)
              }
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 outline-none transition focus:border-[#3A8DFF] focus:ring-4 focus:ring-[#3A8DFF]/10"
            >
              <option value="all">All report types</option>
              <option value="Records">Records</option>
              <option value="Tasks">Tasks</option>
              <option value="Operations">Operations</option>
              <option value="Finance">Finance</option>
            </select>

            <select
              value={format}
              onChange={(event) => setFormat(event.target.value as ExportFormat)}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-600 outline-none transition focus:border-[#3A8DFF] focus:ring-4 focus:ring-[#3A8DFF]/10"
            >
              <option value="XLSX">XLSX</option>
              <option value="CSV">CSV</option>
              <option value="PDF">PDF</option>
            </select>
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Ready Exports</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {readyExports.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ολοκληρωμένα mock exports
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Processing</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {processingExports.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Exports που τρέχουν τώρα
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Failed</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {failedExports.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Mock αποτυχημένα exports
          </p>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Available reports
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Διάλεξε report και πάτησε export για να δημιουργηθεί mock job.
            </p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {visibleTemplates.map((template) => {
            const isProcessing = processingReportId === template.id;

            return (
              <article
                key={template.id}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">
                        {template.name}
                      </h3>
                      <StatusBadge tone={getTypeTone(template.type)}>
                        {template.type}
                      </StatusBadge>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {template.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Rows
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {template.rows.toLocaleString("el-GR")}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Last run
                    </p>
                    <p className="mt-2 text-xl font-semibold text-slate-950">
                      {template.lastRun}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={Boolean(processingReportId)}
                  onClick={() => handleExport(template)}
                  className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[#0B1F3A] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(11,31,58,0.18)] transition hover:bg-[#132f55] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProcessing ? "Creating export..." : `Export ${format}`}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Export history
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Ιστορικό mock exports από το localStorage.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            disabled={exportJobs.length === 0}
            className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear history
          </button>
        </div>

		{exportJobs.length === 0 ? (
		<PageState
			title="Δεν υπάρχουν ακόμα exports"
			description="Πάτησε Export σε ένα από τα διαθέσιμα reports για να δημιουργηθεί mock export job."
			icon="📊"
		/>
		) : (
		<DataTable
			columns={exportColumns}
			data={exportJobs}
			emptyMessage="Δεν υπάρχουν ακόμα mock exports."
		/>
		)}
      </section>
    </div>
  );
}