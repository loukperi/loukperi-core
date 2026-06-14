"use client";

import { FormEvent, useMemo, useState } from "react";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import DataTable, { DataTableColumn } from "@/components/ui/DataTable";
import DetailDrawer from "@/components/ui/DetailDrawer";
import EmptyState from "@/components/ui/EmptyState";
import FilterBar from "@/components/ui/FilterBar";
import { SelectInput, TextArea, TextInput } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import PageState from "@/components/ui/PageState";
import {
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  ApiError,
} from "@/lib/apiClient";
import { useAppSettings } from "@/hooks/useAppSettings";

type RecordStatus = "Open" | "In Progress" | "Done";
type RecordView = "active" | "archived" | "all";
type RecordSource = "Mock" | "Backend" | "Local Draft";

type DemoRecord = {
  code: string;
  title: string;
  type: string;
  status: RecordStatus;
  updatedAt: string;
  archived?: boolean;
  source?: RecordSource;
  backendId?: string;
  notes?: string;
};

type BackendRecord = {
  id?: string | number;
  code?: string | number;
  title?: string;
  name?: string;
  description?: string;
  type?: string;
  category?: string;
  status?: unknown;
  archived?: unknown;
  dataJson?: unknown;
  data_jsonb?: unknown;
  updatedAt?: string;
  createdAt?: string;
};

const initialRecords: DemoRecord[] = [
  {
    code: "REC-001",
    title: "Demo sales order review",
    type: "Order",
    status: "Open",
    updatedAt: "Σήμερα",
    archived: false,
    source: "Mock",
    notes: "Πρώτο demo record για έλεγχο του flow.",
  },
  {
    code: "REC-002",
    title: "Customer account check",
    type: "Account",
    status: "In Progress",
    updatedAt: "Χθες",
    archived: false,
    source: "Mock",
    notes: "Έλεγχος στοιχείων πελάτη και υπολοίπων.",
  },
  {
    code: "REC-003",
    title: "Monthly report preparation",
    type: "Report",
    status: "Done",
    updatedAt: "Πριν 2 ημέρες",
    archived: false,
    source: "Mock",
    notes: "Προετοιμασία mock report για demo.",
  },
];

function getStatusTone(status: RecordStatus) {
  if (status === "Open") return "amber";
  if (status === "In Progress") return "blue";
  return "green";
}

function normalizeRecordStatus(status?: unknown): RecordStatus {
  if (status === null || status === undefined) {
    return "Open";
  }

  const normalized =
    typeof status === "string"
      ? status.toLowerCase()
      : typeof status === "number" || typeof status === "boolean"
        ? String(status).toLowerCase()
        : typeof status === "object" && "name" in status
          ? String((status as { name?: unknown }).name ?? "").toLowerCase()
          : String(status).toLowerCase();

  if (normalized.includes("progress")) return "In Progress";
  if (normalized.includes("done")) return "Done";
  if (normalized.includes("closed")) return "Done";
  if (normalized.includes("complete")) return "Done";

  return "Open";
}

function normalizeBoolean(value: unknown) {
  if (value === true) return true;
  if (value === false) return false;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (["true", "1", "yes"].includes(normalized)) return true;
    if (["false", "0", "no", ""].includes(normalized)) return false;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  return false;
}

function getBackendJsonObject(record: BackendRecord) {
  const raw = record.dataJson ?? record.data_jsonb;

  if (!raw) return undefined;

  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }

  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);

      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function getBackendJsonValue(record: BackendRecord, key: string) {
  const dataJson = getBackendJsonObject(record);

  if (!dataJson) {
    return undefined;
  }

  return dataJson[key];
}

function normalizeBackendRecords(payload: unknown): DemoRecord[] {
  const source = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        "items" in payload &&
        Array.isArray((payload as { items: unknown }).items)
      ? (payload as { items: unknown[] }).items
      : payload &&
          typeof payload === "object" &&
          "records" in payload &&
          Array.isArray((payload as { records: unknown }).records)
        ? (payload as { records: unknown[] }).records
        : payload && typeof payload === "object"
          ? [payload]
          : [];

  return source.map((item, index) => {
    const record = item as BackendRecord;
    const jsonArchived = getBackendJsonValue(record, "archived");

    return {
      backendId: record.id === undefined ? undefined : String(record.id),
      code: String(
        record.code ??
          record.id ??
          `API-REC-${String(index + 1).padStart(3, "0")}`
      ),
      title: String(
        record.title ?? record.name ?? record.description ?? "Backend record"
      ),
      type: String(
        record.type ??
          record.category ??
          getBackendJsonValue(record, "type") ??
          "Backend"
      ),
      status: normalizeRecordStatus(
        record.status ?? getBackendJsonValue(record, "status")
      ),
      updatedAt: String(record.updatedAt ?? record.createdAt ?? "Από Backend API"),
      archived: normalizeBoolean(record.archived ?? jsonArchived),
      source: "Backend",
      notes: String(getBackendJsonValue(record, "notes") ?? ""),
    };
  });
}

function isUuidLike(value?: string) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value
  );
}

function getEffectiveRecordSource(record: DemoRecord): RecordSource {
  if (record.source) {
    return record.source;
  }

  if (record.backendId || isUuidLike(record.code)) {
    return "Backend";
  }

  return "Mock";
}

export default function RecordsPage() {
  const { toast } = useToast();
  const { settings } = useAppSettings();

  const [records, setRecords] = useLocalStorageState<DemoRecord[]>(
    "loukperi_demo_records",
    initialRecords
  );

  const [isLoadingBackendRecords, setIsLoadingBackendRecords] = useState(false);
  const [isSavingRecord, setIsSavingRecord] = useState(false);
  const [canSaveRecordAsLocalDraft, setCanSaveRecordAsLocalDraft] =
    useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DemoRecord | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [confirmAction, setConfirmAction] = useState<
    "archive" | "delete" | null
  >(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [recordView, setRecordView] = useState<RecordView>("active");

  const [title, setTitle] = useState("");
  const [type, setType] = useState("Order");
  const [status, setStatus] = useState<RecordStatus>("Open");
  const [notes, setNotes] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("Order");
  const [editStatus, setEditStatus] = useState<RecordStatus>("Open");
  const [editNotes, setEditNotes] = useState("");

  const activeRecords = useMemo(
    () => records.filter((record) => !record.archived),
    [records]
  );

  const archivedRecords = useMemo(
    () => records.filter((record) => record.archived),
    [records]
  );

  const visibleRecords = useMemo(() => {
    if (recordView === "archived") {
      return archivedRecords;
    }

    if (recordView === "all") {
      return records;
    }

    return activeRecords;
  }, [recordView, records, activeRecords, archivedRecords]);

  const recordTypes = useMemo(() => {
    const uniqueTypes = Array.from(
      new Set(visibleRecords.map((record) => record.type))
    );

    return uniqueTypes.sort();
  }, [visibleRecords]);

  const filteredRecords = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return visibleRecords.filter((record) => {
      const matchesSearch =
        !normalizedSearch ||
        record.code.toLowerCase().includes(normalizedSearch) ||
        record.title.toLowerCase().includes(normalizedSearch) ||
        record.type.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || record.status === statusFilter;

      const matchesType = typeFilter === "all" || record.type === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [visibleRecords, search, statusFilter, typeFilter]);

  const columns: DataTableColumn<DemoRecord>[] = [
    {
      header: "Code",
      cell: (row) => (
        <span className="font-semibold text-slate-950">{row.code}</span>
      ),
    },
    {
      header: "Title",
      cell: (row) => (
        <span className="font-medium text-slate-700">{row.title}</span>
      ),
    },
    {
      header: "Type",
      cell: (row) => <span className="text-slate-500">{row.type}</span>,
    },
    {
      header: "State",
      cell: (row) => (
        <StatusBadge tone={row.archived ? "amber" : "blue"}>
          {row.archived ? "Archived" : "Active"}
        </StatusBadge>
      ),
    },
    {
      header: "Source",
      cell: (row) => {
        const source = getEffectiveRecordSource(row);

        return (
          <StatusBadge
            tone={
              source === "Backend"
                ? "green"
                : source === "Local Draft"
                  ? "amber"
                  : "blue"
            }
          >
            {source}
          </StatusBadge>
        );
      },
    },
    {
      header: "Status",
      cell: (row) => (
        <StatusBadge tone={getStatusTone(row.status)}>{row.status}</StatusBadge>
      ),
    },
    {
      header: "Updated",
      cell: (row) => <span className="text-slate-500">{row.updatedAt}</span>,
    },
  ];

  function getRecordKey(record: DemoRecord) {
    return record.backendId ?? record.code;
  }

  function isBackendWriteRecord(record: DemoRecord) {
    return (
      settings.dataSourceMode.trim().toLowerCase() === "backend api" &&
      getEffectiveRecordSource(record) === "Backend"
    );
  }

  function getBackendRecordPath(record: DemoRecord) {
    return `/records/${encodeURIComponent(getRecordKey(record))}`;
  }

  function getApiErrorMessage(error: unknown) {
    if (error instanceof ApiError) {
      return `Status ${error.status}: ${error.message}`;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return "Unknown backend error";
  }

  function upsertRecordLocally(nextRecord: DemoRecord) {
    setRecords((current) =>
      current.map((record) =>
        getRecordKey(record) === getRecordKey(nextRecord) ? nextRecord : record
      )
    );
  }

  function removeRecordLocally(recordToRemove: DemoRecord) {
    setRecords((current) =>
      current.filter(
        (record) => getRecordKey(record) !== getRecordKey(recordToRemove)
      )
    );
  }

  function resetCreateForm() {
    setTitle("");
    setType("Order");
    setStatus("Open");
    setNotes("");
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
    setRecordView("active");
  }

  function closeModal() {
    setModalOpen(false);
    resetCreateForm();
    setCanSaveRecordAsLocalDraft(false);
    setIsSavingRecord(false);
  }

  function closeDrawer() {
    setSelectedRecord(null);
    setEditMode(false);
  }

  function buildRecordFromForm(source: RecordSource): DemoRecord {
    return {
      code: `REC-${String(records.length + 1).padStart(3, "0")}`,
      title: title.trim() || "Untitled record",
      type,
      status,
      updatedAt: "Μόλις τώρα",
      archived: false,
      source,
      notes: notes.trim(),
    };
  }

  async function handleCreateRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCanSaveRecordAsLocalDraft(false);

    if (settings.dataSourceMode === "Mock") {
      const newRecord = buildRecordFromForm("Mock");

      setRecords((current) => [newRecord, ...current]);
      closeModal();

      toast({
        title: "Record created",
        description: `${newRecord.code} δημιουργήθηκε σε Mock mode.`,
        tone: "success",
      });

      return;
    }

    if (settings.dataSourceMode === "SQL Server Connector") {
      setCanSaveRecordAsLocalDraft(true);

      toast({
        title: "Connector write is not ready yet",
        description:
          "Το SQL Server Connector mode δεν κάνει ακόμα write. Μπορείς να το κρατήσεις ως Local Draft.",
        tone: "warning",
      });

      return;
    }

    const draftRecord = buildRecordFromForm("Local Draft");

    try {
      setIsSavingRecord(true);

      const payload = await apiPost<unknown>(
        "/records",
        {
          code: draftRecord.code,
          title: draftRecord.title,
          type: draftRecord.type,
          status: draftRecord.status,
        },
        {
          auth: true,
          unwrapData: true,
        }
      );

      const normalized = normalizeBackendRecords(payload);
      const normalizedRecord = normalized[0];

      const backendRecord: DemoRecord = normalizedRecord
        ? {
            ...draftRecord,
            ...normalizedRecord,
            title:
              normalizedRecord.title === "Backend record"
                ? draftRecord.title
                : normalizedRecord.title,
            notes: normalizedRecord.notes?.trim()
              ? normalizedRecord.notes
              : draftRecord.notes,
            source: "Backend",
          }
        : {
            ...draftRecord,
            source: "Backend",
            updatedAt: "Από Backend API",
          };

      setRecords((current) => [
        backendRecord,
        ...current.filter((record) => getRecordKey(record) !== getRecordKey(backendRecord)),
      ]);

      closeModal();

      toast({
        title: "Record saved to backend",
        description: `${backendRecord.code} αποθηκεύτηκε στο Backend API.`,
        tone: "success",
      });
    } catch (error) {
      const message = getApiErrorMessage(error);

      setCanSaveRecordAsLocalDraft(true);

      toast({
        title: "Backend save failed",
        description: `${message}. Η φόρμα έμεινε ανοιχτή για να μη χαθεί η εγγραφή.`,
        tone: "error",
      });
    } finally {
      setIsSavingRecord(false);
    }
  }

  function handleSaveRecordAsLocalDraft() {
    const localDraft = buildRecordFromForm("Local Draft");

    setRecords((current) => [
      localDraft,
      ...current.filter((record) => record.code !== localDraft.code),
    ]);

    closeModal();

    toast({
      title: "Saved as local draft",
      description: `${localDraft.code} αποθηκεύτηκε προσωρινά μόνο στο localStorage.`,
      tone: "warning",
    });
  }

  function startEditRecord() {
    if (!selectedRecord) return;

    setEditTitle(selectedRecord.title);
    setEditType(selectedRecord.type);
    setEditStatus(selectedRecord.status);
    setEditNotes(selectedRecord.notes ?? "");
    setEditMode(true);
  }

  function cancelEditRecord() {
    setEditMode(false);
  }

  async function handleSaveRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRecord) return;

    const updatedRecord: DemoRecord = {
      ...selectedRecord,
      title: editTitle.trim() || "Untitled record",
      type: editType,
      status: editStatus,
      notes: editNotes.trim(),
      updatedAt: "Μόλις τώρα",
    };

    if (isBackendWriteRecord(selectedRecord)) {
      try {
        setIsSavingRecord(true);

        const payload = await apiPatch<unknown>(
          getBackendRecordPath(selectedRecord),
          {
            description: updatedRecord.title,
            data_jsonb: {
              notes: updatedRecord.notes ?? "",
              type: updatedRecord.type,
              status: updatedRecord.status,
              archived: Boolean(updatedRecord.archived),
            },
          },
          {
            auth: true,
            unwrapData: true,
          }
        );

        const normalized = normalizeBackendRecords(payload);
        const normalizedRecord = normalized[0];

        const backendRecord: DemoRecord = normalizedRecord
          ? {
              ...updatedRecord,
              ...normalizedRecord,
              title:
                normalizedRecord.title === "Backend record"
                  ? updatedRecord.title
                  : normalizedRecord.title,
              notes: normalizedRecord.notes?.trim()
                ? normalizedRecord.notes
                : updatedRecord.notes,
              backendId: normalizedRecord.backendId ?? updatedRecord.backendId,
              source: "Backend",
            }
          : {
              ...updatedRecord,
              source: "Backend",
            };

        upsertRecordLocally(backendRecord);
        setSelectedRecord(backendRecord);
        setEditMode(false);

        toast({
          title: "Record updated in backend",
          description: `${backendRecord.code} ενημερώθηκε στο Backend API.`,
          tone: "success",
        });
      } catch (error) {
        toast({
          title: "Backend update failed",
          description: getApiErrorMessage(error),
          tone: "error",
        });
      } finally {
        setIsSavingRecord(false);
      }

      return;
    }

    upsertRecordLocally(updatedRecord);
    setSelectedRecord(updatedRecord);
    setEditMode(false);

    toast({
      title: "Record updated",
      description: `${updatedRecord.code} ενημερώθηκε τοπικά.`,
      tone: "success",
    });
  }

  async function handleArchiveRecord() {
    if (!selectedRecord) return;

    const archivedRecord: DemoRecord = {
      ...selectedRecord,
      archived: true,
      updatedAt: "Μόλις τώρα",
    };

    if (isBackendWriteRecord(selectedRecord)) {
      try {
        await apiPatch<unknown>(
          getBackendRecordPath(selectedRecord),
          {
            data_jsonb: {
              notes: archivedRecord.notes ?? "",
              type: archivedRecord.type,
              status: archivedRecord.status,
              archived: true,
            },
          },
          {
            auth: true,
            unwrapData: true,
          }
        );

        upsertRecordLocally(archivedRecord);
        setConfirmAction(null);
        closeDrawer();

        toast({
          title: "Record archived in backend",
          description: `${archivedRecord.code} αρχειοθετήθηκε στο Backend API.`,
          tone: "warning",
        });
      } catch (error) {
        setConfirmAction(null);

        toast({
          title: "Backend archive failed",
          description: getApiErrorMessage(error),
          tone: "error",
        });
      }

      return;
    }

    upsertRecordLocally(archivedRecord);
    setConfirmAction(null);
    closeDrawer();

    toast({
      title: "Record archived",
      description: `${archivedRecord.code} μεταφέρθηκε στα archived records.`,
      tone: "warning",
    });
  }

  async function handleRestoreRecord() {
    if (!selectedRecord) return;

    const restoredRecord: DemoRecord = {
      ...selectedRecord,
      archived: false,
      updatedAt: "Μόλις τώρα",
    };

    if (isBackendWriteRecord(selectedRecord)) {
      try {
        await apiPatch<unknown>(
          getBackendRecordPath(selectedRecord),
          {
            data_jsonb: {
              notes: restoredRecord.notes ?? "",
              type: restoredRecord.type,
              status: restoredRecord.status,
              archived: false,
            },
          },
          {
            auth: true,
            unwrapData: true,
          }
        );

        upsertRecordLocally(restoredRecord);
        setSelectedRecord(restoredRecord);

        toast({
          title: "Record restored in backend",
          description: `${restoredRecord.code} επανήλθε στο Backend API.`,
          tone: "success",
        });
      } catch (error) {
        toast({
          title: "Backend restore failed",
          description: getApiErrorMessage(error),
          tone: "error",
        });
      }

      return;
    }

    upsertRecordLocally(restoredRecord);
    setSelectedRecord(restoredRecord);

    toast({
      title: "Record restored",
      description: `${restoredRecord.code} επέστρεψε στα active records.`,
      tone: "success",
    });
  }

  async function handleDeleteRecord() {
    if (!selectedRecord) return;

    const deletedCode = selectedRecord.code;

    if (isBackendWriteRecord(selectedRecord)) {
      try {
        await apiDelete<unknown>(getBackendRecordPath(selectedRecord), {
          auth: true,
          unwrapData: false,
        });

        removeRecordLocally(selectedRecord);
        setConfirmAction(null);
        closeDrawer();

        toast({
          title: "Record deleted from backend",
          description: `${deletedCode} διαγράφηκε από το Backend API.`,
          tone: "error",
        });
      } catch (error) {
        setConfirmAction(null);

        toast({
          title: "Backend delete failed",
          description: getApiErrorMessage(error),
          tone: "error",
        });
      }

      return;
    }

    removeRecordLocally(selectedRecord);
    setConfirmAction(null);
    closeDrawer();

    toast({
      title: "Record deleted",
      description: `${deletedCode} αφαιρέθηκε από το local state.`,
      tone: "error",
    });
  }

  async function handleLoadRecordsFromBackend() {
    try {
      setIsLoadingBackendRecords(true);

      const payload = await apiGet<unknown>("/records", {
        auth: true,
        unwrapData: true,
      });

      const backendRecords = normalizeBackendRecords(payload);

      if (backendRecords.length === 0) {
        toast({
          title: "No backend records found",
          description: "Το backend απάντησε, αλλά δεν επέστρεψε records.",
          tone: "warning",
        });

        return;
      }

      setRecords((current) => {
        const merged = [...backendRecords, ...current];
        const uniqueByCode = new Map<string, DemoRecord>();

        merged.forEach((record) => {
          uniqueByCode.set(getRecordKey(record), record);
        });

        return Array.from(uniqueByCode.values());
      });

      toast({
        title: "Records loaded from backend",
        description: `Φορτώθηκαν ${backendRecords.length} records από το Backend API.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Backend records failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsLoadingBackendRecords(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Records"
        title="Business Records"
        description="Καθαρό business table για παραγγελίες, πελάτες, αιτήματα, υποθέσεις ή οποιοδήποτε custom record ορίσουμε στο LoukPeri Core."
        actions={
          <>
            <AppButton variant="secondary" onClick={resetFilters}>
              Reset Filters
            </AppButton>

            <AppButton
              variant="secondary"
              onClick={handleLoadRecordsFromBackend}
              disabled={
                isLoadingBackendRecords || settings.dataSourceMode === "Mock"
              }
            >
              {isLoadingBackendRecords ? "Loading..." : "Load from Backend"}
            </AppButton>

            <AppButton onClick={() => setModalOpen(true)}>New Record</AppButton>
          </>
        }
      />

      <section className="grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Active Records</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {activeRecords.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Records στο current workspace
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Archived</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {archivedRecords.length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Records που έχουν αρχειοθετηθεί
          </p>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Open</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">
            {activeRecords.filter((record) => record.status === "Open").length}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            Ανοιχτές ενέργειες / records
          </p>
        </div>
      </section>

      <FilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search records by code, title ή type..."
        filters={[
          {
            label: "View",
            value: recordView,
            onChange: (value) => setRecordView(value as RecordView),
            options: [
              { label: "Active records", value: "active" },
              { label: "Archived records", value: "archived" },
              { label: "All records", value: "all" },
            ],
          },
          {
            label: "Status",
            value: statusFilter,
            onChange: setStatusFilter,
            options: [
              { label: "All statuses", value: "all" },
              { label: "Open", value: "Open" },
              { label: "In Progress", value: "In Progress" },
              { label: "Done", value: "Done" },
            ],
          },
          {
            label: "Type",
            value: typeFilter,
            onChange: setTypeFilter,
            options: [
              { label: "All types", value: "all" },
              ...recordTypes.map((recordType) => ({
                label: recordType,
                value: recordType,
              })),
            ],
          },
        ]}
      />

      {filteredRecords.length === 0 ? (
        <PageState
          title={
            visibleRecords.length === 0
              ? "Δεν υπάρχουν records σε αυτό το view"
              : "Δεν βρέθηκαν records με αυτά τα φίλτρα"
          }
          description={
            visibleRecords.length === 0
              ? "Δοκίμασε να αλλάξεις το View σε Active, Archived ή All records."
              : "Άλλαξε search, status ή type filter για να δεις περισσότερα αποτελέσματα."
          }
          actionLabel="Reset filters"
          onAction={resetFilters}
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredRecords}
          emptyMessage="Δεν υπάρχουν records."
          onRowClick={(record) => {
            setSelectedRecord(record);
            setEditMode(false);
          }}
        />
      )}

      <EmptyState
        title="Έτοιμο για live records"
        description="Το UI είναι πλέον έτοιμο. Στο επόμενο μεγάλο στάδιο θα συνδέσουμε search, filters και table με backend query params."
      />

      <AppModal
        open={modalOpen}
        title="New Record"
        description="Δημιουργία νέου business record. Αν το Data Source Mode είναι Backend API, θα γίνει προσπάθεια αποθήκευσης στο backend."
        onClose={closeModal}
      >
        <form onSubmit={handleCreateRecord} className="space-y-5">
          <TextInput
            label="Title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="π.χ. Customer order review"
            required
          />

          <div className="grid gap-5 md:grid-cols-2">
            <SelectInput
              label="Type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              options={["Order", "Account", "Report", "Case", "Request"]}
            />

            <SelectInput
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as RecordStatus)}
              options={["Open", "In Progress", "Done"]}
            />
          </div>

          <TextArea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Προαιρετικές σημειώσεις για το record..."
          />

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <AppButton variant="secondary" onClick={closeModal}>
              Cancel
            </AppButton>

            {canSaveRecordAsLocalDraft ? (
              <AppButton
                type="button"
                variant="secondary"
                onClick={handleSaveRecordAsLocalDraft}
                disabled={isSavingRecord}
              >
                Save as Local Draft
              </AppButton>
            ) : null}

            <AppButton type="submit" disabled={isSavingRecord}>
              {isSavingRecord
                ? "Saving..."
                : settings.dataSourceMode === "Backend API"
                  ? "Save to Backend"
                  : "Create Record"}
            </AppButton>
          </div>
        </form>
      </AppModal>

      <DetailDrawer
        open={Boolean(selectedRecord)}
        eyebrow={editMode ? "Edit Record" : "Record Preview"}
        title={selectedRecord?.code || "Record"}
        description={selectedRecord?.title}
        onClose={closeDrawer}
        footer={
          editMode ? null : selectedRecord?.archived ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <AppButton variant="ghost" onClick={() => setConfirmAction("delete")}>
                Delete
              </AppButton>

              <AppButton onClick={handleRestoreRecord}>Restore Record</AppButton>

              <AppButton variant="secondary" onClick={closeDrawer}>
                Close
              </AppButton>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <AppButton variant="ghost" onClick={() => setConfirmAction("delete")}>
                Delete
              </AppButton>

              <AppButton
                variant="secondary"
                onClick={() => setConfirmAction("archive")}
              >
                Archive
              </AppButton>

              <AppButton variant="secondary" onClick={closeDrawer}>
                Close
              </AppButton>

              <AppButton onClick={startEditRecord}>Edit Record</AppButton>
            </div>
          )
        }
      >
        {selectedRecord ? (
          editMode ? (
            <form onSubmit={handleSaveRecord} className="space-y-5">
              <TextInput
                label="Title"
                value={editTitle}
                onChange={(event) => setEditTitle(event.target.value)}
                required
              />

              <div className="grid gap-5 md:grid-cols-2">
                <SelectInput
                  label="Type"
                  value={editType}
                  onChange={(event) => setEditType(event.target.value)}
                  options={["Order", "Account", "Report", "Case", "Request"]}
                />

                <SelectInput
                  label="Status"
                  value={editStatus}
                  onChange={(event) =>
                    setEditStatus(event.target.value as RecordStatus)
                  }
                  options={["Open", "In Progress", "Done"]}
                />
              </div>

              <TextArea
                label="Notes"
                value={editNotes}
                onChange={(event) => setEditNotes(event.target.value)}
                placeholder="Σημειώσεις αλλαγής..."
              />

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <AppButton variant="secondary" onClick={cancelEditRecord}>
                  Cancel Edit
                </AppButton>

                <AppButton type="submit" disabled={isSavingRecord}>
                  {isSavingRecord
                    ? "Saving..."
                    : selectedRecord &&
                        isBackendWriteRecord(selectedRecord)
                      ? "Save to Backend"
                      : "Save Changes"}
                </AppButton>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Status
                </p>
                <div className="mt-3">
                  <StatusBadge tone={getStatusTone(selectedRecord.status)}>
                    {selectedRecord.status}
                  </StatusBadge>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">Source</p>
                <div className="mt-2">
                  {(() => {
                    const source = getEffectiveRecordSource(selectedRecord);

                    return (
                      <StatusBadge
                        tone={
                          source === "Backend"
                            ? "green"
                            : source === "Local Draft"
                              ? "amber"
                              : "blue"
                        }
                      >
                        {source}
                      </StatusBadge>
                    );
                  })()}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-medium text-slate-500">Code</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {selectedRecord.code}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-medium text-slate-500">Type</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {selectedRecord.type}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-medium text-slate-500">Updated</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {selectedRecord.updatedAt}
                  </p>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-white p-5">
                  <p className="text-sm font-medium text-slate-500">State</p>
                  <div className="mt-2">
                    <StatusBadge
                      tone={selectedRecord.archived ? "amber" : "blue"}
                    >
                      {selectedRecord.archived ? "Archived" : "Active"}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-medium text-slate-500">Notes</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {selectedRecord.notes?.trim()
                    ? selectedRecord.notes
                    : "Δεν υπάρχουν σημειώσεις για αυτό το record."}
                </p>
              </div>
            </div>
          )
        ) : null}
      </DetailDrawer>

      <ConfirmDialog
        open={confirmAction === "archive"}
        tone="warning"
        title="Archive record?"
        description={`Το record ${
          selectedRecord?.code || ""
        } θα αφαιρεθεί από την ενεργή λίστα, αλλά δεν θα διαγραφεί οριστικά.`}
        confirmLabel="Archive Record"
        onClose={() => setConfirmAction(null)}
        onConfirm={handleArchiveRecord}
      />

      <ConfirmDialog
        open={confirmAction === "delete"}
        tone="danger"
        title="Delete record?"
        description={`Το record ${
          selectedRecord?.code || ""
        } θα διαγραφεί. Αν είναι backend record και είσαι σε Backend API mode, θα γίνει DELETE στο backend.`}
        confirmLabel="Delete Record"
        onClose={() => setConfirmAction(null)}
        onConfirm={handleDeleteRecord}
      />
    </div>
  );
}