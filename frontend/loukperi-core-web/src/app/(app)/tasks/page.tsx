"use client";

import { ChangeEvent, FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import AppButton from "@/components/ui/AppButton";
import AppModal from "@/components/ui/AppModal";
import DataTable, { DataTableColumn } from "@/components/ui/DataTable";
import FilterBar from "@/components/ui/FilterBar";
import { SelectInput, TextArea, TextInput } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { useLocalStorageState } from "@/hooks/useLocalStorageState";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/ToastProvider";
import PageState from "@/components/ui/PageState";
import { apiGet, apiPost, apiPatch, apiDelete, ApiError } from "@/lib/apiClient";
import { useAppSettings } from "@/hooks/useAppSettings";

type TaskStatus = "Open" | "In Progress" | "Done" | "Cancelled";
type TaskPriority = "Low" | "Normal" | "High";
type TaskView = "active" | "archived" | "all";
type TaskLayout = "table" | "kanban";
type TaskDetailTab = "details" | "comments" | "attachments" | "activity";
type KanbanGroupBy = "status" | "assignee" | "priority";
type TaskSource = "Mock" | "Backend" | "Local Draft";

type SavedTaskView = {
  id: string;
  name: string;
  search: string;
  statusFilter: string;
  priorityFilter: string;
  assigneeFilter: string;
  taskView: TaskView;
  taskLayout?: TaskLayout;
  kanbanGroupBy?: KanbanGroupBy;
  kanbanVisibleStatuses?: TaskStatus[];
  createdAt: string;
  updatedAt: string;
};
type TaskActivityTone = "blue" | "green" | "amber" | "red" | "slate";
type TaskActivityAction =
  | "created"
  | "updated"
  | "completed"
  | "reopened"
  | "assigned"
  | "due_changed"
  | "comment_added"
  | "attachment_added"
  | "attachment_removed"
  | "archived"
  | "restored";

type TaskActivityEvent = {
  id: string;
  action: TaskActivityAction;
  label: string;
  description: string;
  actor: string;
  createdAt: string;
  tone: TaskActivityTone;
};

type TaskComment = {
  id: string;
  body: string;
  author: string;
  createdAt: string;
};

type TaskAttachment = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
  uploadedAt: string;
  storageKey?: string | null;
  previewable?: boolean;
};

type TaskFilePreview = {
  attachmentId: string;
  fileName: string;
  mimeType: string;
  objectUrl: string;
};

const TASK_ALLOWED_FILE_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "xls",
  "xlsx",
  "csv",
  "doc",
  "docx",
  "txt",
] as const;

const TASK_FILE_ACCEPT = [
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".xls",
  ".xlsx",
  ".csv",
  ".doc",
  ".docx",
  ".txt",
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
].join(",");

const TASK_FILE_RULES = [
  { label: "PDF", extensions: ["pdf"], maxBytes: 25 * 1024 * 1024, previewable: true },
  { label: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif"], maxBytes: 10 * 1024 * 1024, previewable: true },
  { label: "Excel / CSV", extensions: ["xls", "xlsx", "csv"], maxBytes: 25 * 1024 * 1024, previewable: false },
  { label: "Word documents", extensions: ["doc", "docx"], maxBytes: 25 * 1024 * 1024, previewable: false },
  { label: "Text", extensions: ["txt"], maxBytes: 5 * 1024 * 1024, previewable: true },
];

type TaskNotificationTone = "blue" | "green" | "amber" | "red" | "slate";
type TaskNotificationKind =
  | "due_today"
  | "due_tomorrow"
  | "due_this_week"
  | "overdue"
  | "high_unassigned";

type TaskNotification = {
  id: string;
  backendId?: string;
  taskKey: string;
  taskTitle: string;
  kind: TaskNotificationKind;
  title: string;
  description: string;
  tone: TaskNotificationTone;
  createdAt: string;
  readAt?: string | null;
  dismissedAt?: string | null;
  snoozedUntil?: string | null;
};

type TaskNotificationState = {
  readAt?: string;
  dismissedAt?: string;
  snoozedUntil?: string;
};

type AppUser = {
  id: string;
  name?: string | null;
  full_name?: string | null;
  fullName?: string | null;
  username?: string | null;
  email?: string | null;
};

type DemoTask = {
  localId?: string;
  backendId?: string;
  title: string;
  owner: string;
  assigneeUserId?: string | null;
  assignee?: AppUser | null;
  status: TaskStatus;
  priority: TaskPriority;
  due: string;
  archived?: boolean;
  source?: TaskSource;
  notes?: string;
  comments?: TaskComment[];
  attachments?: TaskAttachment[];
  activity?: TaskActivityEvent[];
};

type BackendTask = {
  id?: string | number;
  title?: string;
  name?: string;
  description?: string;
  owner?: string;
  ownerName?: string;
  assignee?: unknown;
  comments?: unknown;
  attachments?: unknown;
  files?: unknown;
  activity?: unknown;
  activity_logs?: unknown;
  assigneeUserId?: string | number | null;
  assignee_user_id?: string | number | null;
  assigned_to_user_id?: string | number | null;
  userId?: string | number | null;
  user_id?: string | number | null;
  status?: unknown;
  priority?: unknown;
  due?: string;
  dueAt?: string;
  due_at?: string;
  archived?: unknown;
  dataJson?: unknown;
  data_jsonb?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

const initialTasks: DemoTask[] = [
  {
    localId: "TASK-001",
    title: "Check pending customer import",
    owner: "Admin",
    status: "Open",
    priority: "High",
    due: "Σήμερα",
    archived: false,
    source: "Mock",
    notes: "Έλεγχος pending customer import στο demo flow.",
  },
  {
    localId: "TASK-002",
    title: "Prepare report export test",
    owner: "Admin",
    status: "In Progress",
    priority: "Normal",
    due: "Αύριο",
    archived: false,
    source: "Mock",
    notes: "Προετοιμασία δοκιμής export για reports.",
  },
  {
    localId: "TASK-003",
    title: "Validate dashboard counters",
    owner: "System",
    status: "Done",
    priority: "Low",
    due: "Χθες",
    archived: false,
    source: "Mock",
    notes: "Έλεγχος counters στο dashboard.",
  },
];

function getStatusTone(status: TaskStatus) {
  if (status === "Open") return "amber";
  if (status === "In Progress") return "blue";
  if (status === "Cancelled") return "red";

  return "green";
}

function getPriorityTone(priority: TaskPriority) {
  if (priority === "High") return "red";
  if (priority === "Normal") return "blue";
  return "slate";
}

function normalizeTextValue(value: unknown) {
  if (value === null || value === undefined) return "";

  if (typeof value === "object") {
    if ("name" in value) {
      return String((value as { name?: unknown }).name ?? "");
    }

    if ("title" in value) {
      return String((value as { title?: unknown }).title ?? "");
    }
  }

  return String(value);
}

function getUserLabel(user?: AppUser | null) {
  if (!user) return "Χωρίς ανάθεση";

  return (
    user.full_name?.trim() ||
    user.fullName?.trim() ||
    user.name?.trim() ||
    user.username?.trim() ||
    user.email?.trim() ||
    "Χρήστης"
  );
}

function normalizeUserPayload(payload: unknown): AppUser[] {
  const source = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        "items" in payload &&
        Array.isArray((payload as { items: unknown }).items)
      ? (payload as { items: unknown[] }).items
      : payload &&
          typeof payload === "object" &&
          "users" in payload &&
          Array.isArray((payload as { users: unknown }).users)
        ? (payload as { users: unknown[] }).users
        : payload &&
            typeof payload === "object" &&
            "data" in payload &&
            Array.isArray((payload as { data: unknown }).data)
          ? (payload as { data: unknown[] }).data
          : [];

  const normalizedUsers: Array<AppUser | null> = source.map((item) => {
    if (!item || typeof item !== "object") return null;

    const raw = item as Record<string, unknown>;
    const rawId = raw.id ?? raw.user_id ?? raw.userId;

    if (rawId === null || rawId === undefined || String(rawId).trim() === "") {
      return null;
    }

    return {
      id: String(rawId),
      name: raw.name === undefined ? null : String(raw.name),
      full_name: raw.full_name === undefined ? null : String(raw.full_name),
      fullName: raw.fullName === undefined ? null : String(raw.fullName),
      username: raw.username === undefined ? null : String(raw.username),
      email: raw.email === undefined ? null : String(raw.email),
    };
  });

  return normalizedUsers.filter((user): user is AppUser => Boolean(user));
}

function normalizeAssigneeObject(value: unknown): AppUser | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const rawId = raw.id ?? raw.user_id ?? raw.userId;

  if (rawId === null || rawId === undefined || String(rawId).trim() === "") {
    return null;
  }

  return {
    id: String(rawId),
    name: raw.name === undefined ? null : String(raw.name),
    full_name: raw.full_name === undefined ? null : String(raw.full_name),
    fullName: raw.fullName === undefined ? null : String(raw.fullName),
    username: raw.username === undefined ? null : String(raw.username),
    email: raw.email === undefined ? null : String(raw.email),
  };
}

function normalizeTaskStatus(status?: unknown): TaskStatus {
  const normalized = normalizeTextValue(status).toLowerCase();

  if (normalized.includes("progress")) return "In Progress";
  if (normalized.includes("done")) return "Done";
  if (normalized.includes("closed")) return "Done";
  if (normalized.includes("complete")) return "Done";
  if (normalized.includes("cancel")) return "Cancelled";
  if (normalized.includes("archive")) return "Cancelled";

  return "Open";
}

function normalizeTaskPriority(priority?: unknown): TaskPriority {
  const normalized = normalizeTextValue(priority).toLowerCase();

  if (normalized.includes("high")) return "High";
  if (normalized.includes("low")) return "Low";

  return "Normal";
}

function mapTaskPriorityToBackend(priority: TaskPriority) {
  if (priority === "High") return "high";
  if (priority === "Low") return "low";

  return "medium";
}

function mapTaskStatusToBackend(status: TaskStatus) {
  if (status === "In Progress") return "in_progress";
  if (status === "Done") return "completed";
  if (status === "Cancelled") return "cancelled";

  return "open";
}

function createDueAtIso(daysToAdd: number) {
  const date = new Date();

  date.setDate(date.getDate() + daysToAdd);
  date.setHours(18, 0, 0, 0);

  return date.toISOString();
}

function getDateKey(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function normalizeBackendDueForUi(value: unknown) {
  const raw = normalizeTextValue(value).trim();

  if (!raw) {
    return "Χωρίς ημερομηνία";
  }

  const dueDate = new Date(raw);

  if (Number.isNaN(dueDate.getTime())) {
    return raw;
  }

  const today = new Date();
  const tomorrow = new Date();

  tomorrow.setDate(today.getDate() + 1);

  if (getDateKey(dueDate) === getDateKey(today)) {
    return "Σήμερα";
  }

  if (getDateKey(dueDate) === getDateKey(tomorrow)) {
    return "Αύριο";
  }

  const startToday = new Date(today);
  startToday.setHours(0, 0, 0, 0);

  const startDue = new Date(dueDate);
  startDue.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (startDue.getTime() - startToday.getTime()) / 86_400_000
  );

  if (diffDays >= 0 && diffDays <= 7) {
    return "Αυτή την εβδομάδα";
  }

  return "Χωρίς ημερομηνία";
}

function createThisWeekDueAtIso() {
  const date = new Date();
  const currentDay = date.getDay();

  // Sunday = 0, Monday = 1, ..., Friday = 5
  const daysUntilFriday =
    currentDay <= 5 ? 5 - currentDay : 7 - currentDay + 5;

  date.setDate(date.getDate() + daysUntilFriday);
  date.setHours(18, 0, 0, 0);

  return date.toISOString();
}

function mapTaskDueToBackend(due: string) {
  if (due === "Σήμερα") {
    return createDueAtIso(0);
  }

  if (due === "Αύριο") {
    return createDueAtIso(1);
  }

  if (due === "Αυτή την εβδομάδα") {
    return createThisWeekDueAtIso();
  }

  return undefined;
}

function mapBulkTaskDueToBackend(due: string) {
  if (due === "Χωρίς ημερομηνία") {
    return null;
  }

  return mapTaskDueToBackend(due) ?? null;
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

function getBackendJsonObject(task: BackendTask) {
  const raw = task.dataJson ?? task.data_jsonb;

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

function getBackendJsonValue(task: BackendTask, key: string) {
  const dataJson = getBackendJsonObject(task);

  if (!dataJson) {
    return undefined;
  }

  return dataJson[key];
}

function isArchivedBackendTask(task: BackendTask) {
  const rawStatus = normalizeTextValue(
    task.status ?? getBackendJsonValue(task, "status")
  ).toLowerCase();

  return (
    normalizeBoolean(task.archived ?? getBackendJsonValue(task, "archived")) ||
    rawStatus.includes("cancel")
  );
}

function normalizeTaskAttachments(value: unknown): TaskAttachment[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const rawFileName = raw.fileName ?? raw.file_name ?? raw.name;

      if (!rawFileName || String(rawFileName).trim() === "") {
        return null;
      }

      const sizeValue = Number(raw.sizeBytes ?? raw.size_bytes ?? raw.size ?? 0);

      return {
        id: String(
          raw.id ?? `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        ),
        fileName: String(rawFileName),
        mimeType: String(raw.mimeType ?? raw.mime_type ?? raw.type ?? "unknown"),
        sizeBytes: Number.isFinite(sizeValue) ? sizeValue : 0,
        uploadedBy: String(raw.uploadedBy ?? raw.uploaded_by ?? raw.author ?? "System"),
        uploadedAt: String(raw.uploadedAt ?? raw.uploaded_at ?? raw.createdAt ?? raw.created_at ?? "Legacy"),
        storageKey:
          raw.storageKey === undefined && raw.storage_key === undefined
            ? null
            : String(raw.storageKey ?? raw.storage_key),
        previewable:
          typeof raw.previewable === "boolean"
            ? raw.previewable
            : isPreviewableTaskAttachment({
                fileName: String(raw.fileName ?? raw.file_name ?? raw.name ?? "attachment"),
                mimeType: String(raw.mimeType ?? raw.mime_type ?? raw.type ?? "application/octet-stream"),
              }),
      };
    })
    .filter((attachment): attachment is TaskAttachment => Boolean(attachment));
}


function normalizeTaskCommentsPayload(payload: unknown): TaskComment[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "items" in payload && Array.isArray((payload as { items: unknown }).items)
      ? (payload as { items: unknown[] }).items
      : payload && typeof payload === "object" && "comments" in payload && Array.isArray((payload as { comments: unknown }).comments)
        ? (payload as { comments: unknown[] }).comments
        : payload && typeof payload === "object"
          ? [payload]
          : [];

  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const body = raw.body ?? raw.comment ?? raw.text ?? raw.note;

      if (!body || String(body).trim() === "") {
        return null;
      }

      return {
        id: String(raw.id ?? `COM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        body: String(body),
        author: String(raw.author ?? raw.author_name ?? raw.author_user_id ?? "System"),
        createdAt: String(raw.createdAt ?? raw.created_at ?? "Legacy"),
      };
    })
    .filter((comment): comment is TaskComment => Boolean(comment));
}

function normalizeTaskAttachmentsPayload(payload: unknown): TaskAttachment[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "items" in payload && Array.isArray((payload as { items: unknown }).items)
      ? (payload as { items: unknown[] }).items
      : payload && typeof payload === "object" && "files" in payload && Array.isArray((payload as { files: unknown }).files)
        ? (payload as { files: unknown[] }).files
        : payload && typeof payload === "object" && "attachments" in payload && Array.isArray((payload as { attachments: unknown }).attachments)
          ? (payload as { attachments: unknown[] }).attachments
          : payload && typeof payload === "object"
            ? [payload]
            : [];

  return normalizeTaskAttachments(source);
}

function getTaskFileExtension(fileName: string) {
  const cleanName = fileName.toLowerCase().split("?")[0] ?? "";
  const parts = cleanName.split(".");

  return parts.length > 1 ? parts[parts.length - 1] : "";
}

function getTaskFileRule(file: File | { fileName: string; mimeType?: string }) {
  const extension = getTaskFileExtension("name" in file ? file.name : file.fileName);

  return TASK_FILE_RULES.find((rule) => rule.extensions.includes(extension));
}

function validateTaskUploadFile(file: File) {
  const rule = getTaskFileRule(file);

  if (!rule) {
    return `Δεν υποστηρίζεται ο τύπος αρχείου "${file.name}". Επιτρέπονται: ${TASK_ALLOWED_FILE_EXTENSIONS.join(", ")}.`;
  }

  if (file.size <= 0) {
    return `Το αρχείο "${file.name}" είναι κενό.`;
  }

  if (file.size > rule.maxBytes) {
    return `Το αρχείο "${file.name}" είναι πολύ μεγάλο. Μέγιστο για ${rule.label}: ${formatFileSize(rule.maxBytes)}.`;
  }

  return "";
}

function isPreviewableTaskAttachment(
  attachment: Pick<TaskAttachment, "fileName" | "mimeType">,
) {
  const mimeType = (attachment.mimeType || "").toLowerCase();

  if (
    mimeType.startsWith("image/") ||
    mimeType === "application/pdf" ||
    mimeType === "text/plain"
  ) {
    return true;
  }

  const rule = getTaskFileRule(attachment);

  return Boolean(rule?.previewable);
}

function getUploadApiBaseUrl() {
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "http://localhost:3000/api/v1";

  return envBase.replace(/\/$/, "");
}

function getStoredAccessToken() {
  if (typeof window === "undefined") return "";

  const directKeys = [
    "access_token",
    "accessToken",
    "token",
    "auth_token",
    "loukperi_access_token",
    "loukperi_token",
  ];

  for (const key of directKeys) {
    const value = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);

    if (value && value.trim()) {
      return value.trim().replace(/^"|"$/g, "");
    }
  }

  const jsonKeys = [
    "auth",
    "loukperi_auth",
    "loukperi_auth_state",
    "loukperi_session",
    "session",
  ];

  for (const key of jsonKeys) {
    const raw = window.localStorage.getItem(key) || window.sessionStorage.getItem(key);

    if (!raw) continue;

    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const candidate =
        parsed.access_token ||
        parsed.accessToken ||
        parsed.token ||
        (parsed.user && typeof parsed.user === "object"
          ? (parsed.user as Record<string, unknown>).access_token ||
            (parsed.user as Record<string, unknown>).accessToken ||
            (parsed.user as Record<string, unknown>).token
          : "");

      if (candidate) {
        return String(candidate);
      }
    } catch {
      // Ignore non-JSON auth storage values.
    }
  }

  return "";
}

async function apiUploadTaskFile(taskId: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const token = getStoredAccessToken();
  const response = await fetch(
    `${getUploadApiBaseUrl()}/tasks/${taskId}/files/upload`,
    {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      body: formData,
    }
  );

  const contentType = response.headers.get("content-type") ?? "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "message" in payload
        ? Array.isArray((payload as { message: unknown }).message)
          ? (payload as { message: string[] }).message.join(", ")
          : String((payload as { message: unknown }).message)
        : typeof payload === "string" && payload
          ? payload
          : `Upload failed with status ${response.status}`;

    throw new Error(message);
  }

  return payload;
}

async function apiFetchTaskFileBlob(taskId: string, attachment: TaskAttachment) {
  const token = getStoredAccessToken();

  const response = await fetch(
    `${getUploadApiBaseUrl()}/tasks/${taskId}/files/${attachment.id}/download`,
    {
      method: "GET",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }
  );

  if (!response.ok) {
    throw new Error(`File request failed with status ${response.status}`);
  }

  const blob = await response.blob();
  const mimeType =
    response.headers.get("content-type") ||
    attachment.mimeType ||
    blob.type ||
    "application/octet-stream";

  return {
    blob,
    mimeType,
    objectUrl: window.URL.createObjectURL(blob),
  };
}

async function apiDownloadTaskFile(taskId: string, attachment: TaskAttachment) {
  const { objectUrl } = await apiFetchTaskFileBlob(taskId, attachment);

  try {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = attachment.fileName || "download";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
  }
}

function normalizeTaskActivityPayload(payload: unknown): TaskActivityEvent[] {
  const source = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && "items" in payload && Array.isArray((payload as { items: unknown }).items)
      ? (payload as { items: unknown[] }).items
      : payload && typeof payload === "object" && "activity" in payload && Array.isArray((payload as { activity: unknown }).activity)
        ? (payload as { activity: unknown[] }).activity
        : payload && typeof payload === "object" && "events" in payload && Array.isArray((payload as { events: unknown }).events)
          ? (payload as { events: unknown[] }).events
          : payload && typeof payload === "object"
            ? [payload]
            : [];

  return source
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const raw = item as Record<string, unknown>;
      const action = String(raw.action ?? raw.eventType ?? raw.event_type ?? "updated") as TaskActivityAction;
      const tone = String(raw.tone ?? "slate") as TaskActivityTone;

      return {
        id: String(raw.id ?? `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
        action,
        label: String(raw.label ?? raw.eventLabel ?? raw.event_label ?? "Task activity"),
        description: String(raw.description ?? "Task activity updated."),
        actor: String(raw.actor ?? raw.actor_user_id ?? "System"),
        createdAt: String(raw.createdAt ?? raw.created_at ?? "Legacy"),
        tone: ["blue", "green", "amber", "red", "slate"].includes(tone) ? tone : "slate",
      };
    })
    .filter((event): event is TaskActivityEvent => Boolean(event));
}

function normalizeBackendTasks(payload: unknown): DemoTask[] {
  const source = Array.isArray(payload)
    ? payload
    : payload &&
        typeof payload === "object" &&
        "items" in payload &&
        Array.isArray((payload as { items: unknown }).items)
      ? (payload as { items: unknown[] }).items
      : payload &&
          typeof payload === "object" &&
          "tasks" in payload &&
          Array.isArray((payload as { tasks: unknown }).tasks)
        ? (payload as { tasks: unknown[] }).tasks
        : payload && typeof payload === "object"
          ? [payload]
          : [];

  return source.map((item, index) => {
    const task = item as BackendTask;
    const assigneeObject = normalizeAssigneeObject(
      task.assignee ?? getBackendJsonValue(task, "assignee")
    );
    const assigneeUserId =
      task.assigneeUserId ??
      task.assignee_user_id ??
      task.assigned_to_user_id ??
      task.userId ??
      task.user_id ??
      getBackendJsonValue(task, "assigneeUserId") ??
      getBackendJsonValue(task, "assignee_user_id") ??
      getBackendJsonValue(task, "assigned_to_user_id") ??
      assigneeObject?.id;

    return {
      backendId: task.id === undefined ? undefined : String(task.id),
      title: String(
        task.title ??
          task.name ??
          task.description ??
          getBackendJsonValue(task, "title") ??
          `Backend task ${index + 1}`
      ),
      owner: String(
        task.owner ??
          task.ownerName ??
          getBackendJsonValue(task, "owner") ??
          (assigneeObject ? getUserLabel(assigneeObject) : "Backend User")
      ),
      assigneeUserId:
        assigneeUserId === null || assigneeUserId === undefined
          ? null
          : String(assigneeUserId),
      assignee: assigneeObject,
      status: normalizeTaskStatus(
        task.status ?? getBackendJsonValue(task, "status")
      ),
      priority: normalizeTaskPriority(
        task.priority ?? getBackendJsonValue(task, "priority")
      ),
	  due: normalizeBackendDueForUi(
	    task.due ?? task.dueAt ?? task.due_at ?? getBackendJsonValue(task, "due")
	  ),
      archived: isArchivedBackendTask(task),
      source: "Backend",
      notes: String(getBackendJsonValue(task, "notes") ?? task.description ?? ""),
      comments: normalizeTaskCommentsPayload(
        task.comments ?? getBackendJsonValue(task, "comments")
      ),
      attachments: normalizeTaskAttachmentsPayload(
        task.attachments ??
          task.files ??
          getBackendJsonValue(task, "attachments") ??
          getBackendJsonValue(task, "files")
      ),
      activity: normalizeTaskActivityPayload(
        task.activity ??
          task.activity_logs ??
          getBackendJsonValue(task, "activity") ??
          getBackendJsonValue(task, "activity_logs")
      ),
    };
  });
}

function getTaskKey(task: DemoTask) {
  return (
    task.backendId ??
    task.localId ??
    `${task.title}-${task.owner}-${task.due}`
  );
}

function getEffectiveTaskSource(task: DemoTask): TaskSource {
  if (task.source) return task.source;
  if (task.backendId) return "Backend";

  return "Mock";
}

function isActionableTask(task: DemoTask) {
  return !task.archived && task.status !== "Done" && task.status !== "Cancelled";
}

function isUnassignedTask(task: DemoTask) {
  return !(task.assigneeUserId ?? task.assignee?.id);
}

function isDueTodayTask(task: DemoTask) {
  return isActionableTask(task) && task.due === "Σήμερα";
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

function createTaskActivityEvent({
  action,
  label,
  description,
  actor,
  tone,
}: {
  action: TaskActivityAction;
  label: string;
  description: string;
  actor: string;
  tone: TaskActivityTone;
}): TaskActivityEvent {
  return {
    id: `ACT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    label,
    description,
    actor: actor.trim() || "System",
    createdAt: new Date().toISOString(),
    tone,
  };
}

function createTaskComment({
  body,
  author,
}: {
  body: string;
  author: string;
}): TaskComment {
  return {
    id: `COM-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    body: body.trim(),
    author: author.trim() || "System",
    createdAt: new Date().toISOString(),
  };
}

function createTaskAttachment({
  fileName,
  mimeType,
  sizeBytes,
  uploadedBy,
}: {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  uploadedBy: string;
}): TaskAttachment {
  return {
    id: `ATT-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    fileName: fileName.trim() || "Untitled file",
    mimeType: mimeType.trim() || "unknown",
    sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
    uploadedBy: uploadedBy.trim() || "System",
    uploadedAt: new Date().toISOString(),
  };
}

function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = sizeBytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formatted = size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1);

  return `${formatted} ${units[unitIndex]}`;
}

function formatActivityDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("el-GR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function createSavedTaskViewId() {
  return `VIEW-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getTaskViewLabel(view: TaskView) {
  if (view === "archived") return "Archived";
  if (view === "all") return "All";

  return "Active";
}

function getNotificationToneClasses(tone: TaskNotificationTone) {
  if (tone === "red") {
    return "border-red-100 bg-red-50 text-red-800";
  }

  if (tone === "amber") {
    return "border-amber-100 bg-amber-50 text-amber-800";
  }

  if (tone === "green") {
    return "border-emerald-100 bg-emerald-50 text-emerald-800";
  }

  if (tone === "blue") {
    return "border-blue-100 bg-blue-50 text-blue-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getNotificationDotClass(tone: TaskNotificationTone) {
  if (tone === "red") return "bg-red-500";
  if (tone === "amber") return "bg-amber-500";
  if (tone === "green") return "bg-emerald-500";
  if (tone === "blue") return "bg-blue-500";

  return "bg-slate-400";
}

function getTomorrowIso() {
  const date = new Date();

  date.setDate(date.getDate() + 1);

  return date.toISOString();
}

const kanbanStatuses: TaskStatus[] = ["Open", "In Progress", "Done", "Cancelled"];
const kanbanPriorities: TaskPriority[] = ["High", "Normal", "Low"];

export default function TasksPage() {
  const { toast } = useToast();
  const { settings } = useAppSettings();

  const [tasks, setTasks] = useLocalStorageState<DemoTask[]>(
    "loukperi_demo_tasks",
    initialTasks
  );
  const [savedViews, setSavedViews] = useLocalStorageState<SavedTaskView[]>(
    "loukperi_task_saved_views",
    []
  );

  const [isLoadingBackendTasks, setIsLoadingBackendTasks] = useState(false);
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [canSaveTaskAsLocalDraft, setCanSaveTaskAsLocalDraft] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<DemoTask | null>(null);
  const [filePreview, setFilePreview] = useState<TaskFilePreview | null>(null);
  const [uploadProgressLabel, setUploadProgressLabel] = useState("");
  const [isLoadingTaskCollaboration, setIsLoadingTaskCollaboration] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [taskDetailTab, setTaskDetailTab] = useState<TaskDetailTab>("details");
  const [confirmAction, setConfirmAction] = useState<
    "archive" | "delete" | "bulk-archive" | "bulk-delete" | null
  >(null);
  const [selectedTaskKeys, setSelectedTaskKeys] = useState<Set<string>>(
    () => new Set()
  );
  const [bulkAssigneeUserId, setBulkAssigneeUserId] = useState("no-change");
  const [bulkDue, setBulkDue] = useState("no-change");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");
  const [taskView, setTaskView] = useState<TaskView>("active");
  const [taskLayout, setTaskLayout] = useState<TaskLayout>("table");
  const [kanbanGroupBy, setKanbanGroupBy] = useState<KanbanGroupBy>("status");
  const [kanbanVisibleStatuses, setKanbanVisibleStatuses] = useState<TaskStatus[]>(kanbanStatuses);
  const [savedViewName, setSavedViewName] = useState("");
  const [selectedSavedViewId, setSelectedSavedViewId] = useState("");

  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("Admin");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [status, setStatus] = useState<TaskStatus>("Open");
  const [priority, setPriority] = useState<TaskPriority>("Normal");
  const [due, setDue] = useState("Σήμερα");
  const [notes, setNotes] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editOwner, setEditOwner] = useState("Admin");
  const [editAssigneeUserId, setEditAssigneeUserId] = useState("");
  const [editStatus, setEditStatus] = useState<TaskStatus>("Open");
  const [editPriority, setEditPriority] = useState<TaskPriority>("Normal");
  const [editDue, setEditDue] = useState("Σήμερα");
  const [editNotes, setEditNotes] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");

  const [notificationStates, setNotificationStates] = useLocalStorageState<Record<string, TaskNotificationState>>(
    "loukperi_task_notification_states",
    {}
  );
  const [backendNotifications, setBackendNotifications] = useState<TaskNotification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [showUnreadOnlyNotifications, setShowUnreadOnlyNotifications] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [showAdvancedControls, setShowAdvancedControls] = useState(false);
  const [showSavedViewsManager, setShowSavedViewsManager] = useState(false);
  const [showCompactStats, setShowCompactStats] = useState(true);

  useEffect(() => {
    return () => {
      if (filePreview?.objectUrl) {
        window.URL.revokeObjectURL(filePreview.objectUrl);
      }
    };
  }, [filePreview?.objectUrl]);

  const getUserById = (id?: string | null) => {
    if (!id) return null;

    return users.find((user) => user.id === id) ?? null;
  };

  const getTaskAssigneeLabel = (task: DemoTask) => {
    const assigneeFromTask = task.assignee ? getUserLabel(task.assignee) : "";
    const assigneeFromUsers = task.assigneeUserId
      ? getUserLabel(getUserById(task.assigneeUserId))
      : "";

    return assigneeFromTask || assigneeFromUsers || "Χωρίς ανάθεση";
  };

  const getSavedViewSummary = (view: Pick<SavedTaskView, "search" | "statusFilter" | "priorityFilter" | "assigneeFilter" | "taskView" | "taskLayout" | "kanbanGroupBy" | "kanbanVisibleStatuses">) => {
    const parts = [getTaskViewLabel(view.taskView)];

    if (view.taskLayout === "kanban") {
      parts.push("Layout: Kanban");
      parts.push(
        view.kanbanGroupBy === "assignee"
          ? "Group: Assignee"
          : view.kanbanGroupBy === "priority"
            ? "Group: Priority"
            : "Group: Status"
      );

      if (view.kanbanGroupBy === "status" && view.kanbanVisibleStatuses?.length) {
        parts.push(`Columns: ${view.kanbanVisibleStatuses.join(", ")}`);
      }
    }

    if (view.statusFilter !== "all") {
      parts.push(`Status: ${view.statusFilter}`);
    }

    if (view.priorityFilter !== "all") {
      parts.push(`Priority: ${view.priorityFilter}`);
    }

    if (view.assigneeFilter !== "all") {
      if (view.assigneeFilter === "unassigned") {
        parts.push("Assignee: Χωρίς ανάθεση");
      } else {
        const user = getUserById(view.assigneeFilter);
        parts.push(`Assignee: ${user ? getUserLabel(user) : `User ${view.assigneeFilter}`}`);
      }
    }

    if (view.search.trim()) {
      parts.push(`Search: ${view.search.trim()}`);
    }

    return parts.join(" • ");
  };

  function withTaskActivity(
    task: DemoTask,
    event: Omit<TaskActivityEvent, "id" | "createdAt">
  ): DemoTask {
    return {
      ...task,
      activity: [
        createTaskActivityEvent(event),
        ...(task.activity ?? []),
      ].slice(0, 30),
    };
  }

  function getTaskActivityEvents(task: DemoTask) {
    if (task.activity?.length) {
      return task.activity;
    }

    return [
      {
        id: `ACT-FALLBACK-${getTaskKey(task)}`,
        action: "created",
        label: "Task created",
        description: `Το task δημιουργήθηκε από ${task.owner || "System"}.`,
        actor: task.owner || "System",
        createdAt: "Legacy",
        tone: "blue",
      },
    ];
  }

  function getTaskComments(task: DemoTask) {
    return task.comments ?? [];
  }

  function getTaskAttachments(task: DemoTask) {
    return task.attachments ?? [];
  }


  function buildTaskNotifications(task: DemoTask): TaskNotification[] {
    const notifications: TaskNotification[] = [];
    const taskKey = getTaskKey(task);
    const isTaskActive = isActionableTask(task);

    if (!isTaskActive) {
      return notifications;
    }

    if (task.due === "Χθες") {
      notifications.push({
        id: `NOTIF-overdue-${taskKey}`,
        taskKey,
        taskTitle: task.title,
        kind: "overdue",
        title: "Overdue task",
        description: `Το task “${task.title}” έχει περασμένο due date.`,
        tone: "red",
        createdAt: new Date().toISOString(),
      });
    }

    if (task.due === "Σήμερα") {
      notifications.push({
        id: `NOTIF-due-today-${taskKey}`,
        taskKey,
        taskTitle: task.title,
        kind: "due_today",
        title: "Due today",
        description: `Το task “${task.title}” λήγει σήμερα.`,
        tone: "amber",
        createdAt: new Date().toISOString(),
      });
    }

    if (task.due === "Αύριο") {
      notifications.push({
        id: `NOTIF-due-tomorrow-${taskKey}`,
        taskKey,
        taskTitle: task.title,
        kind: "due_tomorrow",
        title: "Due tomorrow",
        description: `Το task “${task.title}” λήγει αύριο.`,
        tone: "blue",
        createdAt: new Date().toISOString(),
      });
    }

    if (task.due === "Αυτή την εβδομάδα" && task.priority === "High") {
      notifications.push({
        id: `NOTIF-due-this-week-${taskKey}`,
        taskKey,
        taskTitle: task.title,
        kind: "due_this_week",
        title: "High priority this week",
        description: `Το high priority task “${task.title}” λήγει αυτή την εβδομάδα.`,
        tone: "blue",
        createdAt: new Date().toISOString(),
      });
    }

    if (task.priority === "High" && isUnassignedTask(task)) {
      notifications.push({
        id: `NOTIF-high-unassigned-${taskKey}`,
        taskKey,
        taskTitle: task.title,
        kind: "high_unassigned",
        title: "High priority χωρίς ανάθεση",
        description: `Το task “${task.title}” είναι high priority αλλά δεν έχει assignee.`,
        tone: "red",
        createdAt: new Date().toISOString(),
      });
    }

    return notifications;
  }


  function normalizeBackendNotificationsPayload(payload: unknown): TaskNotification[] {
    const source = Array.isArray(payload)
      ? payload
      : payload && typeof payload === "object" && "items" in payload && Array.isArray((payload as { items: unknown }).items)
        ? (payload as { items: unknown[] }).items
        : payload && typeof payload === "object" && "notifications" in payload && Array.isArray((payload as { notifications: unknown }).notifications)
          ? (payload as { notifications: unknown[] }).notifications
          : [];

    return source
      .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      .map((raw) => {
        const kind = String(raw.kind ?? raw.type ?? "due_today") as TaskNotificationKind;
        const entityId = raw.entityId ?? raw.entity_id ?? raw.taskKey ?? raw.task_key;
        const backendId = String(raw.backendId ?? raw.id ?? crypto.randomUUID());

        return {
          id: backendId,
          backendId,
          taskKey: entityId ? String(entityId) : backendId,
          taskTitle: String(raw.taskTitle ?? raw.task_title ?? raw.title ?? "Task"),
          kind,
          title: String(raw.title ?? "Notification"),
          description: String(raw.description ?? raw.body ?? ""),
          tone: String(raw.tone ?? getNotificationToneForKind(kind)) as TaskNotificationTone,
          createdAt: String(raw.createdAt ?? raw.created_at ?? new Date().toISOString()),
          readAt:
            raw.readAt === undefined && raw.read_at === undefined
              ? null
              : raw.readAt === null || raw.read_at === null
                ? null
                : String(raw.readAt ?? raw.read_at),
          dismissedAt:
            raw.dismissedAt === undefined && raw.dismissed_at === undefined
              ? null
              : raw.dismissedAt === null || raw.dismissed_at === null
                ? null
                : String(raw.dismissedAt ?? raw.dismissed_at),
          snoozedUntil:
            raw.snoozedUntil === undefined && raw.snoozed_until === undefined
              ? null
              : raw.snoozedUntil === null || raw.snoozed_until === null
                ? null
                : String(raw.snoozedUntil ?? raw.snoozed_until),
        };
      });
  }

  function getNotificationToneForKind(kind: TaskNotificationKind): TaskNotificationTone {
    if (kind === "overdue" || kind === "high_unassigned") return "red";
    if (kind === "due_today") return "amber";
    if (kind === "due_tomorrow" || kind === "due_this_week") return "blue";

    return "slate";
  }

  function getNotificationState(notificationId: string) {
    const backendNotification = backendNotifications.find(
      (notification) => notification.id === notificationId
    );

    if (backendNotification?.backendId) {
      return {
        readAt: backendNotification.readAt ?? undefined,
        dismissedAt: backendNotification.dismissedAt ?? undefined,
        snoozedUntil: backendNotification.snoozedUntil ?? undefined,
      };
    }

    return notificationStates[notificationId] ?? {};
  }

  function isNotificationUnread(notification: TaskNotification) {
    if (notification.backendId) {
      return !notification.readAt;
    }

    return !getNotificationState(notification.id).readAt;
  }

  function buildTaskUpdateDescription(before: DemoTask, after: DemoTask) {
    const changes: string[] = [];

    if (before.title !== after.title) {
      changes.push("title");
    }

    if (before.status !== after.status) {
      changes.push(`status: ${before.status} → ${after.status}`);
    }

    if (before.priority !== after.priority) {
      changes.push(`priority: ${before.priority} → ${after.priority}`);
    }

    if (before.due !== after.due) {
      changes.push(`due: ${before.due} → ${after.due}`);
    }

    if (getTaskAssigneeLabel(before) !== getTaskAssigneeLabel(after)) {
      changes.push(
        `assignee: ${getTaskAssigneeLabel(before)} → ${getTaskAssigneeLabel(after)}`
      );
    }

    if ((before.notes ?? "") !== (after.notes ?? "")) {
      changes.push("notes");
    }

    if (changes.length === 0) {
      return "Το task αποθηκεύτηκε χωρίς εμφανείς αλλαγές.";
    }

    return `Αλλαγές: ${changes.join(", ")}.`;
  }

  useEffect(() => {
    async function loadUsers() {
      if (settings.dataSourceMode === "Mock") {
        setUsers([]);
        return;
      }

      try {
        setIsLoadingUsers(true);

        const payload = await apiGet<unknown>("/users", {
          auth: true,
          unwrapData: true,
        });

        setUsers(normalizeUserPayload(payload));
      } catch (error) {
        setUsers([]);

        toast({
          title: "Users load failed",
          description: getApiErrorMessage(error),
          tone: "warning",
        });
      } finally {
        setIsLoadingUsers(false);
      }
    }

    void loadUsers();
  }, [settings.dataSourceMode, toast]);

  const activeTasks = useMemo(
    () => tasks.filter((task) => !task.archived),
    [tasks]
  );

  const archivedTasks = useMemo(
    () => tasks.filter((task) => task.archived),
    [tasks]
  );

  const visibleTasks = useMemo(() => {
    if (taskView === "archived") {
      return archivedTasks;
    }

    if (taskView === "all") {
      return tasks;
    }

    return activeTasks;
  }, [taskView, tasks, activeTasks, archivedTasks]);

  const assigneeFilterOptions = useMemo(() => {
    const assigneeMap = new Map<string, string>();

    users.forEach((user) => {
      assigneeMap.set(user.id, getUserLabel(user));
    });

    tasks.forEach((task) => {
      const id = task.assigneeUserId ?? task.assignee?.id;

      if (!id) return;

      const label = task.assignee
        ? getUserLabel(task.assignee)
        : getUserById(id)
          ? getUserLabel(getUserById(id))
          : `User ${id}`;

      assigneeMap.set(id, label);
    });

    return [
      { label: "All assignees", value: "all" },
      { label: "Χωρίς ανάθεση", value: "unassigned" },
      ...Array.from(assigneeMap.entries())
        .sort(([, firstLabel], [, secondLabel]) =>
          firstLabel.localeCompare(secondLabel, "el")
        )
        .map(([value, label]) => ({ label, value })),
    ];
  }, [tasks, users]);

  const currentSavedView = useMemo(
    () => savedViews.find((view) => view.id === selectedSavedViewId) ?? null,
    [savedViews, selectedSavedViewId]
  );

  const currentFilterSummary = useMemo(
    () =>
      getSavedViewSummary({
        search,
        statusFilter,
        priorityFilter,
        assigneeFilter,
        taskView,
        taskLayout,
        kanbanGroupBy,
        kanbanVisibleStatuses,
      }),
    [
      search,
      statusFilter,
      priorityFilter,
      assigneeFilter,
      taskView,
      taskLayout,
      kanbanGroupBy,
      kanbanVisibleStatuses,
      users,
    ]
  );

  const activeFilterChips = useMemo(() => {
    const chips: Array<{ label: string; value: string }> = [];
    const trimmedSearch = search.trim();

    if (trimmedSearch) {
      chips.push({ label: "Search", value: trimmedSearch });
    }

    if (taskView !== "active") {
      chips.push({ label: "View", value: getTaskViewLabel(taskView) });
    }

    if (statusFilter !== "all") {
      chips.push({ label: "Status", value: statusFilter });
    }

    if (priorityFilter !== "all") {
      chips.push({ label: "Priority", value: priorityFilter });
    }

    if (assigneeFilter !== "all") {
      const assigneeLabel =
        assigneeFilter === "unassigned"
          ? "Χωρίς ανάθεση"
          : getUserLabel(getUserById(assigneeFilter));

      chips.push({ label: "Assignee", value: assigneeLabel });
    }

    if (taskLayout === "kanban") {
      chips.push({
        label: "Layout",
        value:
          kanbanGroupBy === "assignee"
            ? "Kanban ανά χρήστη"
            : kanbanGroupBy === "priority"
              ? "Kanban ανά priority"
              : "Kanban ανά status",
      });
    }

    return chips;
  }, [
    search,
    taskView,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    taskLayout,
    kanbanGroupBy,
    users,
  ]);

  const sortedSavedViews = useMemo(
    () =>
      [...savedViews].sort(
        (first, second) =>
          new Date(second.updatedAt).getTime() - new Date(first.updatedAt).getTime()
      ),
    [savedViews]
  );

  const filteredTasks = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return visibleTasks.filter((task) => {
      const matchesSearch =
        !normalizedSearch ||
        task.title.toLowerCase().includes(normalizedSearch) ||
        task.owner.toLowerCase().includes(normalizedSearch) ||
        getTaskAssigneeLabel(task).toLowerCase().includes(normalizedSearch) ||
        task.due.toLowerCase().includes(normalizedSearch) ||
        (task.notes ?? "").toLowerCase().includes(normalizedSearch) ||
        (task.comments ?? []).some((comment) =>
          comment.body.toLowerCase().includes(normalizedSearch) ||
          comment.author.toLowerCase().includes(normalizedSearch)
        ) ||
        (task.attachments ?? []).some((attachment) =>
          attachment.fileName.toLowerCase().includes(normalizedSearch) ||
          attachment.mimeType.toLowerCase().includes(normalizedSearch) ||
          attachment.uploadedBy.toLowerCase().includes(normalizedSearch)
        );

      const matchesStatus =
        statusFilter === "all" || task.status === statusFilter;

      const matchesPriority =
        priorityFilter === "all" || task.priority === priorityFilter;

      const taskAssigneeId = task.assigneeUserId ?? task.assignee?.id ?? null;

      const matchesAssignee =
        assigneeFilter === "all" ||
        (assigneeFilter === "unassigned" && !taskAssigneeId) ||
        taskAssigneeId === assigneeFilter;

      return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
    });
  }, [visibleTasks, search, statusFilter, priorityFilter, assigneeFilter, users]);


  async function loadBackendNotifications() {
    if (settings.dataSourceMode !== "Backend API") {
      return;
    }

    try {
      setIsLoadingNotifications(true);

      const payload = await apiGet<unknown>("/notifications", {
        auth: true,
        unwrapData: true,
      });

      setBackendNotifications(normalizeBackendNotificationsPayload(payload));
    } catch (error) {
      toast({
        title: "Notifications sync failed",
        description: getApiErrorMessage(error),
        tone: "warning",
      });
    } finally {
      setIsLoadingNotifications(false);
    }
  }

  const taskNotifications = useMemo(() => {
    const source =
      settings.dataSourceMode === "Backend API"
        ? backendNotifications
        : tasks
            .flatMap((task) => buildTaskNotifications(task))
            .filter((notification) => {
              const state = getNotificationState(notification.id);

              if (state.dismissedAt) {
                return false;
              }

              if (state.snoozedUntil && new Date(state.snoozedUntil).getTime() > Date.now()) {
                return false;
              }

              return true;
            });

    return source.sort((first, second) => {
      const toneOrder: Record<TaskNotificationTone, number> = {
        red: 0,
        amber: 1,
        blue: 2,
        green: 3,
        slate: 4,
      };

      return toneOrder[first.tone] - toneOrder[second.tone];
    });
  }, [tasks, users, notificationStates, backendNotifications, settings.dataSourceMode]);

  const visibleTaskNotifications = useMemo(
    () =>
      showUnreadOnlyNotifications
        ? taskNotifications.filter(isNotificationUnread)
        : taskNotifications,
    [taskNotifications, showUnreadOnlyNotifications, notificationStates]
  );

  const unreadNotificationCount = useMemo(
    () => taskNotifications.filter(isNotificationUnread).length,
    [taskNotifications, notificationStates]
  );

  const snoozedNotificationCount = useMemo(() => {
    return Object.values(notificationStates).filter(
      (state) => state.snoozedUntil && new Date(state.snoozedUntil).getTime() > Date.now()
    ).length;
  }, [notificationStates]);

  const kanbanColumns = useMemo(() => {
    if (kanbanGroupBy === "priority") {
      return kanbanPriorities.map((priority) => ({
        id: priority,
        title: priority,
        priority,
        tasks: filteredTasks.filter((task) => task.priority === priority),
      }));
    }

    if (kanbanGroupBy === "assignee") {
      const assigneeColumns = new Map<string, { id: string; title: string; tasks: DemoTask[] }>();

      assigneeColumns.set("unassigned", {
        id: "unassigned",
        title: "Χωρίς ανάθεση",
        tasks: [],
      });

      users.forEach((user) => {
        assigneeColumns.set(user.id, {
          id: user.id,
          title: getUserLabel(user),
          tasks: [],
        });
      });

      filteredTasks.forEach((task) => {
        const assigneeId = task.assigneeUserId ?? task.assignee?.id ?? "unassigned";
        const existingColumn = assigneeColumns.get(assigneeId);

        if (existingColumn) {
          existingColumn.tasks.push(task);
          return;
        }

        assigneeColumns.set(assigneeId, {
          id: assigneeId,
          title: getTaskAssigneeLabel(task),
          tasks: [task],
        });
      });

      return Array.from(assigneeColumns.values())
        .filter((column) => column.id === "unassigned" || column.tasks.length > 0)
        .sort((first, second) => {
          if (first.id === "unassigned") return -1;
          if (second.id === "unassigned") return 1;
          return first.title.localeCompare(second.title, "el");
        });
    }

    const visibleStatusSet = new Set(kanbanVisibleStatuses);

    return kanbanStatuses
      .filter((status) => visibleStatusSet.has(status))
      .map((status) => ({
        id: status,
        title: status,
        status,
        tasks: filteredTasks.filter((task) => task.status === status),
      }));
  }, [filteredTasks, kanbanGroupBy, kanbanVisibleStatuses, users]);

  const selectedFilteredTasks = useMemo(
    () => filteredTasks.filter((task) => selectedTaskKeys.has(getTaskKey(task))),
    [filteredTasks, selectedTaskKeys]
  );

  const selectedFilteredTaskCount = selectedFilteredTasks.length;
  const hasFilteredTasks = filteredTasks.length > 0;
  const allFilteredTasksSelected =
    hasFilteredTasks &&
    filteredTasks.every((task) => selectedTaskKeys.has(getTaskKey(task)));

  useEffect(() => {
    setSelectedTaskKeys((current) => {
      const validKeys = new Set(tasks.map(getTaskKey));
      const next = new Set(
        Array.from(current).filter((taskKey) => validKeys.has(taskKey))
      );

      return next.size === current.size ? current : next;
    });
  }, [tasks]);

  const taskStats = useMemo(() => {
    const actionableTasks = visibleTasks.filter(isActionableTask);

    return [
      {
        label: "Current View",
        value: visibleTasks.length,
        description: "Tasks που ανήκουν στο επιλεγμένο view",
        badge: taskView === "all" ? "All" : taskView === "archived" ? "Archived" : "Active",
      },
      {
        label: "Open",
        value: visibleTasks.filter(
          (task) => !task.archived && task.status === "Open"
        ).length,
        description: "Tasks που δεν έχουν ξεκινήσει ακόμα",
        badge: "Open",
      },
      {
        label: "In Progress",
        value: visibleTasks.filter(
          (task) => !task.archived && task.status === "In Progress"
        ).length,
        description: "Tasks που δουλεύονται αυτή τη στιγμή",
        badge: "Doing",
      },
      {
        label: "Due Today",
        value: visibleTasks.filter(isDueTodayTask).length,
        description: "Ενεργές εργασίες που λήγουν σήμερα",
        badge: "Today",
      },
      {
        label: "High Priority",
        value: actionableTasks.filter((task) => task.priority === "High").length,
        description: "Ενεργές εργασίες υψηλής προτεραιότητας",
        badge: "Focus",
      },
      {
        label: "Unassigned",
        value: actionableTasks.filter(isUnassignedTask).length,
        description: "Ενεργές εργασίες χωρίς ανάθεση",
        badge: "Assign",
      },
    ];
  }, [visibleTasks, taskView]);

  const columns: DataTableColumn<DemoTask>[] = [
    {
      header: "",
      cell: (row) => (
        <div
          className="flex items-center"
          onClick={(event) => event.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={selectedTaskKeys.has(getTaskKey(row))}
            onChange={(event) => handleToggleTaskSelection(event, row)}
            aria-label={`Select task ${row.title}`}
            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      ),
    },
    {
      header: "Task",
      cell: (row) => {
        const isOpenInPanel = selectedTask
          ? getTaskKey(selectedTask) === getTaskKey(row)
          : false;

        return (
          <div className="flex min-w-0 items-center gap-2">
            <span
              className={[
                "h-2.5 w-2.5 shrink-0 rounded-full",
                isOpenInPanel ? "bg-blue-600" : "bg-slate-200",
              ].join(" ")}
            />
            <span
              className={[
                "truncate font-semibold",
                isOpenInPanel ? "text-blue-700" : "text-slate-950",
              ].join(" ")}
            >
              {row.title}
            </span>
          </div>
        );
      },
    },
    {
      header: "Owner",
      cell: (row) => <span className="text-slate-500">{row.owner}</span>,
    },
    {
      header: "Assignee",
      cell: (row) => (
        <span className="text-slate-500">{getTaskAssigneeLabel(row)}</span>
      ),
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
        const source = getEffectiveTaskSource(row);

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
      header: "Priority",
      cell: (row) => (
        <StatusBadge tone={getPriorityTone(row.priority)}>
          {row.priority}
        </StatusBadge>
      ),
    },
    {
      header: "Due",
      cell: (row) => <span className="text-slate-500">{row.due}</span>,
    },
    {
      header: "Actions",
      cell: (row) => {
        const isDone = row.status === "Done";
        const isArchived = Boolean(row.archived);

        return (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={(event) =>
                handleQuickStatusChange(event, row, isDone ? "Open" : "Done")
              }
              disabled={isSavingTask || isArchived}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isDone ? "Reopen" : "Complete"}
            </button>

            <button
              type="button"
              onClick={(event) => handleQuickEditTask(event, row)}
              disabled={isSavingTask}
              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Edit
            </button>
          </div>
        );
      },
    },
  ];

  function resetCreateForm() {
    setTitle("");
    setOwner("Admin");
    setAssigneeUserId("");
    setStatus("Open");
    setPriority("Normal");
    setDue("Σήμερα");
    setNotes("");
  }

  function resetFilters() {
    setSearch("");
    setStatusFilter("all");
    setPriorityFilter("all");
    setAssigneeFilter("all");
    setTaskView("active");
    setTaskLayout("table");
    setKanbanGroupBy("status");
    setKanbanVisibleStatuses(kanbanStatuses);
    setSelectedSavedViewId("");
    setSavedViewName("");
    clearTaskSelection();
  }

  function markFiltersAsManualChange() {
    setSelectedSavedViewId("");
    clearTaskSelection();
  }

  function handleSearchFilterChange(value: string) {
    setSearch(value);
    markFiltersAsManualChange();
  }

  function handleTaskViewFilterChange(value: string) {
    setTaskView(value as TaskView);
    markFiltersAsManualChange();
  }

  function handleTaskLayoutChange(value: TaskLayout) {
    setTaskLayout(value);
    markFiltersAsManualChange();
  }

  function handleKanbanGroupByChange(value: KanbanGroupBy) {
    setKanbanGroupBy(value);
    markFiltersAsManualChange();
  }

  function handleToggleKanbanStatus(status: TaskStatus) {
    setKanbanVisibleStatuses((current) => {
      if (current.includes(status)) {
        return current.length === 1
          ? current
          : current.filter((item) => item !== status);
      }

      return kanbanStatuses.filter((item) => item === status || current.includes(item));
    });
    markFiltersAsManualChange();
  }

  function handleShowAllKanbanStatuses() {
    setKanbanVisibleStatuses(kanbanStatuses);
    markFiltersAsManualChange();
  }

  function handleStatusFilterChange(value: string) {
    setStatusFilter(value);
    markFiltersAsManualChange();
  }

  function handlePriorityFilterChange(value: string) {
    setPriorityFilter(value);
    markFiltersAsManualChange();
  }

  function handleAssigneeFilterChange(value: string) {
    setAssigneeFilter(value);
    markFiltersAsManualChange();
  }

  function handleApplySavedView(viewId: string) {
    setSelectedSavedViewId(viewId);
    clearTaskSelection();

    if (!viewId) {
      return;
    }

    const view = savedViews.find((item) => item.id === viewId);

    if (!view) {
      toast({
        title: "Saved view not found",
        description: "Το saved view δεν υπάρχει πλέον.",
        tone: "warning",
      });

      return;
    }

    setSearch(view.search);
    setStatusFilter(view.statusFilter);
    setPriorityFilter(view.priorityFilter);
    setAssigneeFilter(view.assigneeFilter);
    setTaskView(view.taskView);
    setTaskLayout(view.taskLayout ?? "table");
    setKanbanGroupBy(view.kanbanGroupBy ?? "status");
    setKanbanVisibleStatuses(
      view.kanbanVisibleStatuses?.length ? view.kanbanVisibleStatuses : kanbanStatuses
    );
    setSavedViewName(view.name);

    toast({
      title: "Saved view applied",
      description: view.name,
      tone: "success",
    });
  }

  function handleSaveCurrentView() {
    const name = savedViewName.trim();

    if (!name) {
      toast({
        title: "View name required",
        description: "Γράψε ένα όνομα για το saved view πριν το αποθηκεύσεις.",
        tone: "warning",
      });

      return;
    }

    const now = new Date().toISOString();
    const existingById = selectedSavedViewId
      ? savedViews.find((view) => view.id === selectedSavedViewId)
      : null;
    const existingByName = savedViews.find(
      (view) => view.name.trim().toLowerCase() === name.toLowerCase()
    );
    const id = existingById?.id ?? existingByName?.id ?? createSavedTaskViewId();

    const nextView: SavedTaskView = {
      id,
      name,
      search,
      statusFilter,
      priorityFilter,
      assigneeFilter,
      taskView,
      taskLayout,
      kanbanGroupBy,
      kanbanVisibleStatuses,
      createdAt: existingById?.createdAt ?? existingByName?.createdAt ?? now,
      updatedAt: now,
    };

    setSavedViews((current) => [
      nextView,
      ...current.filter((view) => view.id !== id),
    ].slice(0, 30));
    setSelectedSavedViewId(id);
    setSavedViewName(name);

    toast({
      title: existingById || existingByName ? "Saved view updated" : "Saved view created",
      description: `${name} • ${getSavedViewSummary(nextView)}`,
      tone: "success",
    });
  }

  function handleDeleteSavedView() {
    const view = savedViews.find((item) => item.id === selectedSavedViewId);

    if (!view) {
      return;
    }

    setSavedViews((current) =>
      current.filter((item) => item.id !== selectedSavedViewId)
    );
    setSelectedSavedViewId("");
    setSavedViewName("");

    toast({
      title: "Saved view deleted",
      description: view.name,
      tone: "success",
    });
  }

  function closeModal() {
    setModalOpen(false);
    resetCreateForm();
    setCanSaveTaskAsLocalDraft(false);
    setIsSavingTask(false);
  }

  function closeDrawer() {
    setSelectedTask(null);
    setEditMode(false);
    setTaskDetailTab("details");
    setNewCommentBody("");
  }

  function clearTaskSelection() {
    setSelectedTaskKeys(new Set());
  }

  function handleToggleTaskSelection(
    event: ChangeEvent<HTMLInputElement>,
    task: DemoTask
  ) {
    event.stopPropagation();

    const taskKey = getTaskKey(task);

    setSelectedTaskKeys((current) => {
      const next = new Set(current);

      if (event.target.checked) {
        next.add(taskKey);
      } else {
        next.delete(taskKey);
      }

      return next;
    });
  }

  function handleSelectFilteredTasks() {
    setSelectedTaskKeys((current) => {
      const next = new Set(current);

      filteredTasks.forEach((task) => {
        next.add(getTaskKey(task));
      });

      return next;
    });
  }

  function handleClearFilteredTaskSelection() {
    setSelectedTaskKeys((current) => {
      const filteredKeys = new Set(filteredTasks.map(getTaskKey));
      const next = new Set(
        Array.from(current).filter((taskKey) => !filteredKeys.has(taskKey))
      );

      return next;
    });
  }

  function upsertTaskLocally(nextTask: DemoTask) {
    setTasks((current) =>
      current.map((task) =>
        getTaskKey(task) === getTaskKey(nextTask) ? nextTask : task
      )
    );
  }


  async function loadTaskCollaborationFromBackend(task: DemoTask) {
    const shouldLoadFromBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(task) === "Backend" &&
      Boolean(task.backendId);

    if (!shouldLoadFromBackend) {
      return task;
    }

    try {
      setIsLoadingTaskCollaboration(true);

      const [commentsPayload, filesPayload, activityPayload] = await Promise.all([
        apiGet<unknown>(`/tasks/${task.backendId}/comments`, {
          auth: true,
          unwrapData: true,
        }),
        apiGet<unknown>(`/tasks/${task.backendId}/files`, {
          auth: true,
          unwrapData: true,
        }),
        apiGet<unknown>(`/tasks/${task.backendId}/activity`, {
          auth: true,
          unwrapData: true,
        }),
      ]);

      const nextTask: DemoTask = {
        ...task,
        comments: normalizeTaskCommentsPayload(commentsPayload),
        attachments: normalizeTaskAttachmentsPayload(filesPayload),
        activity: normalizeTaskActivityPayload(activityPayload),
      };

      upsertTaskLocally(nextTask);

      return nextTask;
    } catch (error) {
      toast({
        title: "Task details sync failed",
        description: getApiErrorMessage(error),
        tone: "warning",
      });

      return task;
    } finally {
      setIsLoadingTaskCollaboration(false);
    }
  }

  async function openTaskInPanel(task: DemoTask, tab: TaskDetailTab = "details") {
    setSelectedTask(task);
    setTaskDetailTab(tab);
    setEditMode(false);
    setNewCommentBody("");

    const syncedTask = await loadTaskCollaborationFromBackend(task);

    setSelectedTask((current) => {
      if (!current || getTaskKey(current) !== getTaskKey(task)) {
        return current;
      }

      return syncedTask;
    });
  }

  async function openTaskInEditMode(task: DemoTask) {
    setSelectedTask(task);
    setTaskDetailTab("details");
    setEditMode(true);
    populateEditForm(task);

    const syncedTask = await loadTaskCollaborationFromBackend(task);

    setSelectedTask((current) => {
      if (!current || getTaskKey(current) !== getTaskKey(task)) {
        return current;
      }

      return syncedTask;
    });
    populateEditForm(syncedTask);
  }

  async function refreshSelectedTaskCollaboration(task: DemoTask) {
    const syncedTask = await loadTaskCollaborationFromBackend(task);
    setSelectedTask(syncedTask);
    return syncedTask;
  }

  function removeTaskLocally(taskToRemove: DemoTask) {
    setTasks((current) =>
      current.filter((task) => getTaskKey(task) !== getTaskKey(taskToRemove))
    );
  }

  function applyBulkTaskUpdates(updatedTasks: DemoTask[]) {
    const updatedByKey = new Map(
      updatedTasks.map((task) => [getTaskKey(task), task] as const)
    );

    setTasks((current) =>
      current.map((task) => updatedByKey.get(getTaskKey(task)) ?? task)
    );

    if (selectedTask) {
      const updatedSelectedTask = updatedByKey.get(getTaskKey(selectedTask));

      if (updatedSelectedTask) {
        setSelectedTask(updatedSelectedTask);
      }
    }
  }

  async function saveBulkStatusUpdate(
    taskToUpdate: DemoTask,
    nextStatus: TaskStatus,
    options?: { archived?: boolean }
  ) {
    const updatedTask: DemoTask = withTaskActivity(
      {
        ...taskToUpdate,
        status: nextStatus,
        archived: options?.archived ?? taskToUpdate.archived,
      },
      options?.archived
        ? {
            action: "archived",
            label: "Task archived",
            description: "Το task μεταφέρθηκε στα archived tasks.",
            actor: taskToUpdate.owner,
            tone: "amber",
          }
        : nextStatus === "Done"
          ? {
              action: "completed",
              label: "Task completed",
              description: "Το task ολοκληρώθηκε.",
              actor: taskToUpdate.owner,
              tone: "green",
            }
          : {
              action: "reopened",
              label: "Task reopened",
              description: `Το task άλλαξε status σε ${nextStatus}.`,
              actor: taskToUpdate.owner,
              tone: "blue",
            }
    );

    const shouldSaveToBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(taskToUpdate) === "Backend" &&
      Boolean(taskToUpdate.backendId);

    if (!shouldSaveToBackend) {
      return updatedTask;
    }

    const payload = await apiPatch<unknown>(
      `/tasks/${taskToUpdate.backendId}`,
      {
        status: mapTaskStatusToBackend(nextStatus),
      },
      {
        auth: true,
        unwrapData: true,
      }
    );

    const normalized = normalizeBackendTasks(payload);
    const normalizedTask = normalized[0];

    return normalizedTask
      ? {
          ...updatedTask,
          ...normalizedTask,
          owner:
            normalizedTask.owner === "Backend User"
              ? updatedTask.owner
              : normalizedTask.owner,
          assigneeUserId:
            normalizedTask.assigneeUserId ?? updatedTask.assigneeUserId,
          assignee: normalizedTask.assignee ?? updatedTask.assignee,
          localId: taskToUpdate.localId,
          backendId: taskToUpdate.backendId,
          source: "Backend" as TaskSource,
          title: normalizedTask.title.startsWith("Backend task")
            ? updatedTask.title
            : normalizedTask.title,
          notes: normalizedTask.notes?.trim()
            ? normalizedTask.notes
            : updatedTask.notes,
          archived: options?.archived ?? normalizedTask.archived,
          status: nextStatus,
        }
      : {
          ...updatedTask,
          source: "Backend" as TaskSource,
        };
  }

  async function saveBulkAssigneeUpdate(
    taskToUpdate: DemoTask,
    nextAssigneeUserId: string | null
  ) {
    const selectedUser = getUserById(nextAssigneeUserId);

    const updatedTask: DemoTask = withTaskActivity(
      {
        ...taskToUpdate,
        assigneeUserId: nextAssigneeUserId,
        assignee: selectedUser,
      },
      {
        action: "assigned",
        label: nextAssigneeUserId ? "Task assigned" : "Task unassigned",
        description: nextAssigneeUserId
          ? `Η ανάθεση άλλαξε σε ${getUserLabel(selectedUser)}.`
          : "Η ανάθεση καθαρίστηκε και το task είναι πλέον χωρίς ανάθεση.",
        actor: taskToUpdate.owner,
        tone: nextAssigneeUserId ? "blue" : "slate",
      }
    );

    const shouldSaveToBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(taskToUpdate) === "Backend" &&
      Boolean(taskToUpdate.backendId);

    if (!shouldSaveToBackend) {
      return updatedTask;
    }

    const payload = await apiPatch<unknown>(
      `/tasks/${taskToUpdate.backendId}`,
      {
        assignee_user_id: nextAssigneeUserId,
      },
      {
        auth: true,
        unwrapData: true,
      }
    );

    const normalized = normalizeBackendTasks(payload);
    const normalizedTask = normalized[0];

    return normalizedTask
      ? {
          ...updatedTask,
          ...normalizedTask,
          owner:
            normalizedTask.owner === "Backend User"
              ? updatedTask.owner
              : normalizedTask.owner,
          assigneeUserId:
            normalizedTask.assigneeUserId ?? updatedTask.assigneeUserId,
          assignee: normalizedTask.assignee ?? updatedTask.assignee,
          localId: taskToUpdate.localId,
          backendId: taskToUpdate.backendId,
          source: "Backend" as TaskSource,
          title: normalizedTask.title.startsWith("Backend task")
            ? updatedTask.title
            : normalizedTask.title,
          notes: normalizedTask.notes?.trim()
            ? normalizedTask.notes
            : updatedTask.notes,
        }
      : {
          ...updatedTask,
          source: "Backend" as TaskSource,
        };
  }

  async function handleBulkAssignTasks() {
    if (isSavingTask || selectedFilteredTaskCount === 0) return;

    if (bulkAssigneeUserId === "no-change") {
      toast({
        title: "Select assignee",
        description: "Διάλεξε χρήστη ή Χωρίς ανάθεση πριν εφαρμόσεις μαζική ανάθεση.",
        tone: "warning",
      });

      return;
    }

    const nextAssigneeUserId =
      bulkAssigneeUserId === "unassigned" ? null : bulkAssigneeUserId;

    try {
      setIsSavingTask(true);

      const updatedTasks: DemoTask[] = [];

      for (const task of selectedFilteredTasks) {
        updatedTasks.push(await saveBulkAssigneeUpdate(task, nextAssigneeUserId));
      }

      applyBulkTaskUpdates(updatedTasks);
      clearTaskSelection();
      setBulkAssigneeUserId("no-change");

      const assigneeLabel = nextAssigneeUserId
        ? getUserLabel(getUserById(nextAssigneeUserId))
        : "Χωρίς ανάθεση";

      toast({
        title: "Bulk assign finished",
        description: `${updatedTasks.length} tasks ανατέθηκαν σε: ${assigneeLabel}.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Bulk assign failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function saveBulkDueUpdate(taskToUpdate: DemoTask, nextDue: string) {
    const updatedTask: DemoTask = withTaskActivity(
      {
        ...taskToUpdate,
        due: nextDue,
      },
      {
        action: "due_changed",
        label: "Due date changed",
        description: `Το due date άλλαξε από ${taskToUpdate.due} σε ${nextDue}.`,
        actor: taskToUpdate.owner,
        tone: "amber",
      }
    );

    const shouldSaveToBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(taskToUpdate) === "Backend" &&
      Boolean(taskToUpdate.backendId);

    if (!shouldSaveToBackend) {
      return updatedTask;
    }

    const payload = await apiPatch<unknown>(
      `/tasks/${taskToUpdate.backendId}`,
      {
        due_at: mapBulkTaskDueToBackend(nextDue),
      },
      {
        auth: true,
        unwrapData: true,
      }
    );

    const normalized = normalizeBackendTasks(payload);
    const normalizedTask = normalized[0];

    return normalizedTask
      ? {
          ...updatedTask,
          ...normalizedTask,
          owner:
            normalizedTask.owner === "Backend User"
              ? updatedTask.owner
              : normalizedTask.owner,
          assigneeUserId:
            normalizedTask.assigneeUserId ?? updatedTask.assigneeUserId,
          assignee: normalizedTask.assignee ?? updatedTask.assignee,
          localId: taskToUpdate.localId,
          backendId: taskToUpdate.backendId,
          source: "Backend" as TaskSource,
          title: normalizedTask.title.startsWith("Backend task")
            ? updatedTask.title
            : normalizedTask.title,
          notes: normalizedTask.notes?.trim()
            ? normalizedTask.notes
            : updatedTask.notes,
          due: normalizedTask.due || updatedTask.due,
        }
      : {
          ...updatedTask,
          source: "Backend" as TaskSource,
        };
  }

  async function handleBulkDueDateUpdate() {
    if (isSavingTask || selectedFilteredTaskCount === 0) return;

    if (bulkDue === "no-change") {
      toast({
        title: "Select due date",
        description: "Διάλεξε due date ή Χωρίς ημερομηνία πριν εφαρμόσεις μαζική αλλαγή.",
        tone: "warning",
      });

      return;
    }

    try {
      setIsSavingTask(true);

      const updatedTasks: DemoTask[] = [];

      for (const task of selectedFilteredTasks) {
        updatedTasks.push(await saveBulkDueUpdate(task, bulkDue));
      }

      applyBulkTaskUpdates(updatedTasks);
      clearTaskSelection();
      setBulkDue("no-change");

      toast({
        title: "Bulk due date updated",
        description: `${updatedTasks.length} tasks ενημερώθηκαν σε: ${bulkDue}.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Bulk due date failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleBulkCompleteTasks() {
    if (isSavingTask || selectedFilteredTaskCount === 0) return;

    const tasksToComplete = selectedFilteredTasks.filter(
      (task) => !task.archived && task.status !== "Done" && task.status !== "Cancelled"
    );

    if (tasksToComplete.length === 0) {
      toast({
        title: "No tasks to complete",
        description: "Τα επιλεγμένα tasks είναι ήδη completed ή δεν είναι ενεργά.",
        tone: "warning",
      });

      return;
    }

    try {
      setIsSavingTask(true);

      const updatedTasks: DemoTask[] = [];

      for (const task of tasksToComplete) {
        updatedTasks.push(await saveBulkStatusUpdate(task, "Done"));
      }

      applyBulkTaskUpdates(updatedTasks);
      clearTaskSelection();

      toast({
        title: "Bulk complete finished",
        description: `${updatedTasks.length} tasks έγιναν completed.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Bulk complete failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleBulkArchiveTasks() {
    if (isSavingTask || selectedFilteredTaskCount === 0) return;

    const tasksToArchive = selectedFilteredTasks.filter((task) => !task.archived);

    if (tasksToArchive.length === 0) {
      setConfirmAction(null);

      toast({
        title: "No tasks to archive",
        description: "Τα επιλεγμένα tasks είναι ήδη archived.",
        tone: "warning",
      });

      return;
    }

    try {
      setIsSavingTask(true);

      const updatedTasks: DemoTask[] = [];

      for (const task of tasksToArchive) {
        updatedTasks.push(
          await saveBulkStatusUpdate(task, "Cancelled", { archived: true })
        );
      }

      applyBulkTaskUpdates(updatedTasks);
      clearTaskSelection();
      setConfirmAction(null);

      toast({
        title: "Bulk archive finished",
        description: `${updatedTasks.length} tasks μεταφέρθηκαν στα archived tasks.`,
        tone: "warning",
      });
    } catch (error) {
      toast({
        title: "Bulk archive failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleBulkDeleteTasks() {
    if (isSavingTask || selectedFilteredTaskCount === 0) return;

    const tasksToDelete = [...selectedFilteredTasks];

    try {
      setIsSavingTask(true);

      for (const task of tasksToDelete) {
        const shouldDeleteFromBackend =
          settings.dataSourceMode === "Backend API" &&
          getEffectiveTaskSource(task) === "Backend" &&
          Boolean(task.backendId);

        if (shouldDeleteFromBackend) {
          await apiDelete<unknown>(`/tasks/${task.backendId}`, {
            auth: true,
            unwrapData: true,
          });
        }
      }

      const deletedKeys = new Set(tasksToDelete.map(getTaskKey));

      setTasks((current) =>
        current.filter((task) => !deletedKeys.has(getTaskKey(task)))
      );

      if (selectedTask && deletedKeys.has(getTaskKey(selectedTask))) {
        closeDrawer();
      }

      clearTaskSelection();
      setConfirmAction(null);

      toast({
        title: "Bulk delete finished",
        description: `${tasksToDelete.length} tasks διαγράφηκαν.`,
        tone: "error",
      });
    } catch (error) {
      toast({
        title: "Bulk delete failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleLoadTasksFromBackend() {
    try {
      setIsLoadingBackendTasks(true);

      const payload = await apiGet<unknown>("/tasks", {
        auth: true,
        unwrapData: true,
      });

      const backendTasks = normalizeBackendTasks(payload);

      if (backendTasks.length === 0) {
        toast({
          title: "No backend tasks found",
          description: "Το backend απάντησε, αλλά δεν επέστρεψε tasks.",
          tone: "warning",
        });

        return;
      }

      setTasks((current) => {
        const merged = [...backendTasks, ...current];
        const uniqueByKey = new Map<string, DemoTask>();

        merged.forEach((task) => {
          uniqueByKey.set(getTaskKey(task), task);
        });

        return Array.from(uniqueByKey.values());
      });

      await loadBackendNotifications();

      toast({
        title: "Tasks loaded from backend",
        description: `Φορτώθηκαν ${backendTasks.length} tasks από το Backend API.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Backend tasks failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsLoadingBackendTasks(false);
    }
  }

  function buildTaskFromForm(source: TaskSource): DemoTask {
    const selectedUser = getUserById(assigneeUserId);

    const newTask: DemoTask = {
      localId: `TASK-${Date.now()}`,
      title: title.trim() || "Untitled task",
      owner: owner.trim() || "Admin",
      assigneeUserId: assigneeUserId || null,
      assignee: selectedUser,
      status,
      priority,
      due,
      archived: false,
      source,
      notes: notes.trim(),
    };

    return withTaskActivity(newTask, {
      action: "created",
      label: "Task created",
      description: selectedUser
        ? `Το task δημιουργήθηκε και ανατέθηκε σε ${getUserLabel(selectedUser)}.`
        : "Το task δημιουργήθηκε χωρίς ανάθεση.",
      actor: newTask.owner,
      tone: "blue",
    });
  }

  async function handleCreateTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  
    setCanSaveTaskAsLocalDraft(false);
  
    if (settings.dataSourceMode === "Mock") {
      const newTask = buildTaskFromForm("Mock");
  
      setTasks((current) => [newTask, ...current]);
      closeModal();
  
      toast({
        title: "Task created",
        description: `"${newTask.title}" δημιουργήθηκε σε Mock mode.`,
        tone: "success",
      });
  
      return;
    }
  
    if (settings.dataSourceMode === "SQL Server Connector") {
      setCanSaveTaskAsLocalDraft(true);
  
      toast({
        title: "Connector write is not ready yet",
        description:
          "Το SQL Server Connector mode δεν κάνει ακόμα write. Μπορείς να το κρατήσεις ως Local Draft.",
        tone: "warning",
      });
  
      return;
    }
  
    const draftTask = buildTaskFromForm("Local Draft");
  
    try {
      setIsSavingTask(true);
  
	  const payload = await apiPost<unknown>(
	  "/tasks",
	  {
	  	title: draftTask.title,
	  	description: draftTask.notes?.trim() || undefined,
	  	priority: mapTaskPriorityToBackend(draftTask.priority),
		due_at: mapTaskDueToBackend(draftTask.due),
        assignee_user_id: draftTask.assigneeUserId || null,
	  },
	  {
	  	auth: true,
	  	unwrapData: true,
	  }
	  );
  
      const normalized = normalizeBackendTasks(payload);
      const normalizedTask = normalized[0];
  
      const backendTask: DemoTask = normalizedTask
        ? {
            ...draftTask,
            ...normalizedTask,
            owner:
              normalizedTask.owner === "Backend User"
                ? draftTask.owner
                : normalizedTask.owner,
            assigneeUserId:
              normalizedTask.assigneeUserId ?? draftTask.assigneeUserId,
            assignee: normalizedTask.assignee ?? draftTask.assignee,
            title:
              normalizedTask.title.startsWith("Backend task")
                ? draftTask.title
                : normalizedTask.title,
            notes: normalizedTask.notes?.trim()
              ? normalizedTask.notes
              : draftTask.notes,
            source: "Backend",
          }
        : {
            ...draftTask,
            source: "Backend",
          };
  
      setTasks((current) => [
        backendTask,
        ...current.filter((task) => getTaskKey(task) !== getTaskKey(backendTask)),
      ]);
  
      closeModal();
  
      toast({
        title: "Task saved to backend",
        description: `"${backendTask.title}" αποθηκεύτηκε στο Backend API.`,
        tone: "success",
      });
    } catch (error) {
      setCanSaveTaskAsLocalDraft(true);
  
      toast({
        title: "Backend task save failed",
        description: `${getApiErrorMessage(
          error
        )}. Η φόρμα έμεινε ανοιχτή για να μη χαθεί το task.`,
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }
  
  function handleSaveTaskAsLocalDraft() {
    const localDraft = buildTaskFromForm("Local Draft");
  
    setTasks((current) => [
      localDraft,
      ...current.filter((task) => getTaskKey(task) !== getTaskKey(localDraft)),
    ]);
  
    closeModal();
  
    toast({
      title: "Saved as local draft",
      description: `"${localDraft.title}" αποθηκεύτηκε προσωρινά μόνο στο localStorage.`,
      tone: "warning",
    });
  }  

  function populateEditForm(task: DemoTask) {
    setEditTitle(task.title);
    setEditOwner(task.owner);
    setEditAssigneeUserId(task.assigneeUserId || task.assignee?.id || "");
    setEditStatus(task.status);
    setEditPriority(task.priority);
    setEditDue(task.due);
    setEditNotes(task.notes ?? "");
  }

  function startEditTask() {
    if (!selectedTask) return;

    populateEditForm(selectedTask);
    setEditMode(true);
  }

  function handleQuickEditTask(
    event: MouseEvent<HTMLButtonElement>,
    task: DemoTask
  ) {
    event.stopPropagation();
    void openTaskInEditMode(task);
  }

  function cancelEditTask() {
    setEditMode(false);
  }

  async function handleArchiveTask() {
    if (!selectedTask || isSavingTask) return;
  
    const archivedTask: DemoTask = withTaskActivity(
      {
        ...selectedTask,
        archived: true,
        status: "Cancelled",
      },
      {
        action: "archived",
        label: "Task archived",
        description: "Το task μεταφέρθηκε στα archived tasks.",
        actor: selectedTask.owner,
        tone: "amber",
      }
    );
  
    const shouldSaveToBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(selectedTask) === "Backend" &&
      Boolean(selectedTask.backendId);
  
    if (!shouldSaveToBackend) {
      upsertTaskLocally(archivedTask);
  
      setConfirmAction(null);
      closeDrawer();
  
      toast({
        title: "Task archived",
        description: `"${archivedTask.title}" μεταφέρθηκε στα archived tasks.`,
        tone: "warning",
      });
  
      return;
    }
  
    try {
      setIsSavingTask(true);
  
      const payload = await apiPatch<unknown>(
        `/tasks/${selectedTask.backendId}`,
        {
          status: "cancelled",
        },
        {
          auth: true,
          unwrapData: true,
        }
      );
  
      const normalized = normalizeBackendTasks(payload);
      const normalizedTask = normalized[0];
  
      const backendTask: DemoTask = normalizedTask
        ? {
            ...archivedTask,
            ...normalizedTask,
            owner:
              normalizedTask.owner === "Backend User"
                ? archivedTask.owner
                : normalizedTask.owner,
            assigneeUserId:
              normalizedTask.assigneeUserId ?? archivedTask.assigneeUserId,
            assignee: normalizedTask.assignee ?? archivedTask.assignee,
            localId: selectedTask.localId,
            backendId: selectedTask.backendId,
            source: "Backend",
            archived: true,
            status: "Cancelled",
          }
        : {
            ...archivedTask,
            source: "Backend",
          };
  
      upsertTaskLocally(backendTask);
  
      setConfirmAction(null);
      closeDrawer();
  
      toast({
        title: "Task archived in backend",
        description: `"${backendTask.title}" έγινε archived στο Backend API.`,
        tone: "warning",
      });
    } catch (error) {
      toast({
        title: "Backend task archive failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleDeleteTask() {
    if (!selectedTask || isSavingTask) return;
  
    const deletedTitle = selectedTask.title;
  
    const shouldDeleteFromBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(selectedTask) === "Backend" &&
      Boolean(selectedTask.backendId);
  
    if (!shouldDeleteFromBackend) {
      removeTaskLocally(selectedTask);
  
      setConfirmAction(null);
      closeDrawer();
  
      toast({
        title: "Task deleted locally",
        description: `"${deletedTitle}" αφαιρέθηκε από το local state.`,
        tone: "error",
      });
  
      return;
    }
  
    try {
      setIsSavingTask(true);
  
      await apiDelete<unknown>(`/tasks/${selectedTask.backendId}`, {
        auth: true,
        unwrapData: true,
      });
  
      removeTaskLocally(selectedTask);
  
      setConfirmAction(null);
      closeDrawer();
  
      toast({
        title: "Task deleted from backend",
        description: `"${deletedTitle}" διαγράφηκε από το Backend API.`,
        tone: "error",
      });
    } catch (error) {
      toast({
        title: "Backend task delete failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleChangeTaskStatusForTask(
    taskToUpdate: DemoTask,
    nextStatus: TaskStatus
  ) {
    if (isSavingTask) return;
  
    const updatedTask: DemoTask = withTaskActivity(
      {
        ...taskToUpdate,
        status: nextStatus,
      },
      nextStatus === "Done"
        ? {
            action: "completed",
            label: "Task completed",
            description: "Το task ολοκληρώθηκε.",
            actor: taskToUpdate.owner,
            tone: "green",
          }
        : {
            action: "reopened",
            label: "Task reopened",
            description: `Το task άλλαξε status σε ${nextStatus}.`,
            actor: taskToUpdate.owner,
            tone: "blue",
          }
    );
  
    const shouldSaveToBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(taskToUpdate) === "Backend" &&
      Boolean(taskToUpdate.backendId);
  
    if (!shouldSaveToBackend) {
      upsertTaskLocally(updatedTask);

      if (selectedTask && getTaskKey(selectedTask) === getTaskKey(taskToUpdate)) {
        setSelectedTask(updatedTask);
      }
  
      toast({
        title: nextStatus === "Done" ? "Task completed" : "Task reopened",
        description: `"${updatedTask.title}" ενημερώθηκε τοπικά.`,
        tone: "success",
      });
  
      return;
    }
  
    try {
      setIsSavingTask(true);
  
      const payload = await apiPatch<unknown>(
        `/tasks/${taskToUpdate.backendId}`,
        {
          status: mapTaskStatusToBackend(nextStatus),
        },
        {
          auth: true,
          unwrapData: true,
        }
      );
  
      const normalized = normalizeBackendTasks(payload);
      const normalizedTask = normalized[0];
  
      const backendTask: DemoTask = normalizedTask
        ? {
            ...updatedTask,
            ...normalizedTask,
            owner:
              normalizedTask.owner === "Backend User"
                ? updatedTask.owner
                : normalizedTask.owner,
            assigneeUserId:
              normalizedTask.assigneeUserId ?? updatedTask.assigneeUserId,
            assignee: normalizedTask.assignee ?? updatedTask.assignee,
            localId: taskToUpdate.localId,
            backendId: taskToUpdate.backendId,
            source: "Backend",
            title:
              normalizedTask.title.startsWith("Backend task")
                ? updatedTask.title
                : normalizedTask.title,
            notes: normalizedTask.notes?.trim()
              ? normalizedTask.notes
              : updatedTask.notes,
          }
        : {
            ...updatedTask,
            source: "Backend",
          };
  
      upsertTaskLocally(backendTask);

      if (selectedTask && getTaskKey(selectedTask) === getTaskKey(taskToUpdate)) {
        setSelectedTask(backendTask);
      }
  
      toast({
        title:
          nextStatus === "Done"
            ? "Task completed in backend"
            : "Task reopened in backend",
        description: `"${backendTask.title}" ενημερώθηκε στο Backend API.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Backend task status update failed",
        description: `${getApiErrorMessage(
          error
        )}. Το task δεν άλλαξε status.`,
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleChangeTaskStatus(nextStatus: TaskStatus) {
    if (!selectedTask) return;

    await handleChangeTaskStatusForTask(selectedTask, nextStatus);
  }

  function handleQuickStatusChange(
    event: MouseEvent<HTMLButtonElement>,
    task: DemoTask,
    nextStatus: TaskStatus
  ) {
    event.stopPropagation();
    void handleChangeTaskStatusForTask(task, nextStatus);
  }

  function handleCompleteTask() {
    void handleChangeTaskStatus("Done");
  }
  
  function handleReopenTask() {
    void handleChangeTaskStatus("Open");
  }

  async function handleRestoreTask() {
    if (!selectedTask || isSavingTask) return;
  
    const restoredTask: DemoTask = withTaskActivity(
      {
        ...selectedTask,
        archived: false,
        status: "Open",
      },
      {
        action: "restored",
        label: "Task restored",
        description: "Το task επέστρεψε στα active tasks.",
        actor: selectedTask.owner,
        tone: "green",
      }
    );
  
    const shouldSaveToBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(selectedTask) === "Backend" &&
      Boolean(selectedTask.backendId);
  
    if (!shouldSaveToBackend) {
      upsertTaskLocally(restoredTask);
      setSelectedTask(restoredTask);
  
      toast({
        title: "Task restored",
        description: `"${restoredTask.title}" επέστρεψε στα active tasks.`,
        tone: "success",
      });
  
      return;
    }
  
    try {
      setIsSavingTask(true);
  
      const payload = await apiPatch<unknown>(
        `/tasks/${selectedTask.backendId}`,
        {
          status: "open",
        },
        {
          auth: true,
          unwrapData: true,
        }
      );
  
      const normalized = normalizeBackendTasks(payload);
      const normalizedTask = normalized[0];
  
      const backendTask: DemoTask = normalizedTask
        ? {
            ...restoredTask,
            ...normalizedTask,
            owner:
              normalizedTask.owner === "Backend User"
                ? restoredTask.owner
                : normalizedTask.owner,
            assigneeUserId:
              normalizedTask.assigneeUserId ?? restoredTask.assigneeUserId,
            assignee: normalizedTask.assignee ?? restoredTask.assignee,
            localId: selectedTask.localId,
            backendId: selectedTask.backendId,
            source: "Backend",
            archived: false,
            status: "Open",
          }
        : {
            ...restoredTask,
            source: "Backend",
          };
  
      upsertTaskLocally(backendTask);
      setSelectedTask(backendTask);
  
      toast({
        title: "Task restored in backend",
        description: `"${backendTask.title}" επέστρεψε στα active tasks.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Backend task restore failed",
        description: getApiErrorMessage(error),
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleAddTaskComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedTask) return;

    const body = newCommentBody.trim();

    if (!body) {
      toast({
        title: "Empty comment",
        description: "Γράψε ένα σχόλιο πριν το προσθέσεις στο task.",
        tone: "warning",
      });

      return;
    }

    const actor = selectedTask.owner || "Admin";
    const shouldSaveToBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(selectedTask) === "Backend" &&
      Boolean(selectedTask.backendId);

    if (shouldSaveToBackend) {
      try {
        setIsSavingTask(true);

        const payload = await apiPost<unknown>(
          `/tasks/${selectedTask.backendId}/comments`,
          { body },
          {
            auth: true,
            unwrapData: true,
          }
        );

        const createdComment =
          normalizeTaskCommentsPayload(payload)[0] ?? createTaskComment({ body, author: actor });

        const updatedTask: DemoTask = {
          ...selectedTask,
          comments: [createdComment, ...(selectedTask.comments ?? [])].slice(0, 50),
        };

        upsertTaskLocally(updatedTask);
        setSelectedTask(updatedTask);
        setNewCommentBody("");

        await refreshSelectedTaskCollaboration(updatedTask);

        toast({
          title: "Comment saved in backend",
          description: "Το internal note αποθηκεύτηκε στο Backend API.",
          tone: "success",
        });
      } catch (error) {
        toast({
          title: "Comment save failed",
          description: getApiErrorMessage(error),
          tone: "error",
        });
      } finally {
        setIsSavingTask(false);
      }

      return;
    }

    const comment = createTaskComment({ body, author: actor });

    const updatedTask = withTaskActivity(
      {
        ...selectedTask,
        comments: [comment, ...(selectedTask.comments ?? [])].slice(0, 50),
      },
      {
        action: "comment_added",
        label: "Comment added",
        description: "Προστέθηκε νέο internal note στο task.",
        actor,
        tone: "slate",
      }
    );

    upsertTaskLocally(updatedTask);
    setSelectedTask(updatedTask);
    setNewCommentBody("");

    toast({
      title: "Comment added",
      description: "Το internal note προστέθηκε στο task.",
      tone: "success",
    });
  }


  async function handleAddTaskAttachments(event: ChangeEvent<HTMLInputElement>) {
    if (!selectedTask) return;

    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    const validationError = files.map(validateTaskUploadFile).find(Boolean);

    if (validationError) {
      toast({
        title: "File not allowed",
        description: validationError,
        tone: "warning",
      });

      return;
    }

    const actor = selectedTask.owner || "Admin";
    const shouldSaveToBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(selectedTask) === "Backend" &&
      Boolean(selectedTask.backendId);

    if (shouldSaveToBackend) {
      try {
        setIsSavingTask(true);

        const savedAttachments: TaskAttachment[] = [];

        for (const [index, file] of files.entries()) {
          setUploadProgressLabel(`Uploading ${index + 1}/${files.length}: ${file.name}`);

          const payload = await apiUploadTaskFile(selectedTask.backendId, file);

          const savedAttachment =
            normalizeTaskAttachmentsPayload(payload)[0] ??
            createTaskAttachment({
              fileName: file.name,
              mimeType: file.type || "unknown",
              sizeBytes: file.size,
              uploadedBy: actor,
            });

          savedAttachments.push(savedAttachment);
        }

        const updatedTask: DemoTask = {
          ...selectedTask,
          attachments: [...savedAttachments, ...(selectedTask.attachments ?? [])].slice(0, 100),
        };

        upsertTaskLocally(updatedTask);
        setSelectedTask(updatedTask);

        await refreshSelectedTaskCollaboration(updatedTask);

        toast({
          title: savedAttachments.length === 1 ? "Attachment saved in backend" : "Attachments saved in backend",
          description:
            savedAttachments.length === 1
              ? `Προστέθηκε το αρχείο ${savedAttachments[0].fileName}.`
              : `Προστέθηκαν ${savedAttachments.length} αρχεία στο task.`,
          tone: "success",
        });
      } catch (error) {
        toast({
          title: "Attachment save failed",
          description: getApiErrorMessage(error),
          tone: "error",
        });
      } finally {
        setUploadProgressLabel("");
        setIsSavingTask(false);
      }

      return;
    }

    const newAttachments = files.map((file) =>
      createTaskAttachment({
        fileName: file.name,
        mimeType: file.type || "unknown",
        sizeBytes: file.size,
        uploadedBy: actor,
      })
    );

    const updatedTask = withTaskActivity(
      {
        ...selectedTask,
        attachments: [
          ...newAttachments,
          ...(selectedTask.attachments ?? []),
        ].slice(0, 100),
      },
      {
        action: "attachment_added",
        label: newAttachments.length === 1 ? "Attachment added" : "Attachments added",
        description:
          newAttachments.length === 1
            ? `Προστέθηκε το αρχείο ${newAttachments[0].fileName}.`
            : `Προστέθηκαν ${newAttachments.length} αρχεία στο task.`,
        actor,
        tone: "blue",
      }
    );

    upsertTaskLocally(updatedTask);
    setSelectedTask(updatedTask);

    toast({
      title: newAttachments.length === 1 ? "Attachment added" : "Attachments added",
      description:
        newAttachments.length === 1
          ? `Προστέθηκε το αρχείο ${newAttachments[0].fileName}.`
          : `Προστέθηκαν ${newAttachments.length} αρχεία στο task.`,
      tone: "success",
    });
  }

  function closeFilePreview() {
    if (filePreview?.objectUrl) {
      window.URL.revokeObjectURL(filePreview.objectUrl);
    }

    setFilePreview(null);
  }

  async function handlePreviewTaskAttachment(attachment: TaskAttachment) {
    if (!selectedTask?.backendId) return;

    if (!isPreviewableTaskAttachment(attachment)) {
      toast({
        title: "Preview not available",
        description: "Για αυτόν τον τύπο αρχείου χρησιμοποίησε Download.",
        tone: "warning",
      });

      return;
    }

    try {
      setIsSavingTask(true);

      const { objectUrl, mimeType } = await apiFetchTaskFileBlob(
        selectedTask.backendId,
        attachment
      );

      if (filePreview?.objectUrl) {
        window.URL.revokeObjectURL(filePreview.objectUrl);
      }

      setFilePreview({
        attachmentId: attachment.id,
        fileName: attachment.fileName,
        mimeType,
        objectUrl,
      });
    } catch (error) {
      toast({
        title: "Preview failed",
        description: error instanceof Error ? error.message : "Δεν ήταν δυνατή η προεπισκόπηση του αρχείου.",
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleDownloadTaskAttachment(attachment: TaskAttachment) {
    if (!selectedTask?.backendId) return;

    try {
      setIsSavingTask(true);
      await apiDownloadTaskFile(selectedTask.backendId, attachment);

      toast({
        title: "Download started",
        description: `Κατεβαίνει το αρχείο ${attachment.fileName}.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Δεν ήταν δυνατή η λήψη του αρχείου.",
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  async function handleRemoveTaskAttachment(attachmentId: string) {
    if (!selectedTask) return;

    const attachmentToRemove = (selectedTask.attachments ?? []).find(
      (attachment) => attachment.id === attachmentId
    );

    if (!attachmentToRemove) return;

    const actor = selectedTask.owner || "Admin";
    const shouldDeleteFromBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(selectedTask) === "Backend" &&
      Boolean(selectedTask.backendId);

    if (shouldDeleteFromBackend) {
      try {
        setIsSavingTask(true);

        await apiDelete<unknown>(
          `/tasks/${selectedTask.backendId}/files/${attachmentId}`,
          {
            auth: true,
            unwrapData: true,
          }
        );

        const updatedTask: DemoTask = {
          ...selectedTask,
          attachments: (selectedTask.attachments ?? []).filter(
            (attachment) => attachment.id !== attachmentId
          ),
        };

        upsertTaskLocally(updatedTask);
        setSelectedTask(updatedTask);
        await refreshSelectedTaskCollaboration(updatedTask);

        toast({
          title: "Attachment removed from backend",
          description: `Το αρχείο ${attachmentToRemove.fileName} αφαιρέθηκε από το task.`,
          tone: "success",
        });
      } catch (error) {
        toast({
          title: "Attachment remove failed",
          description: getApiErrorMessage(error),
          tone: "error",
        });
      } finally {
        setIsSavingTask(false);
      }

      return;
    }

    const updatedTask = withTaskActivity(
      {
        ...selectedTask,
        attachments: (selectedTask.attachments ?? []).filter(
          (attachment) => attachment.id !== attachmentId
        ),
      },
      {
        action: "attachment_removed",
        label: "Attachment removed",
        description: `Αφαιρέθηκε το αρχείο ${attachmentToRemove.fileName}.`,
        actor,
        tone: "red",
      }
    );

    upsertTaskLocally(updatedTask);
    setSelectedTask(updatedTask);

    if (filePreview?.attachmentId === attachmentId) {
      closeFilePreview();
    }

    toast({
      title: "Attachment removed",
      description: `Το αρχείο ${attachmentToRemove.fileName} αφαιρέθηκε από το task.`,
      tone: "success",
    });
  }

  async function handleMarkNotificationRead(notificationId: string) {
    const backendNotification = backendNotifications.find(
      (notification) => notification.id === notificationId
    );

    if (backendNotification?.backendId) {
      await apiPatch<unknown>(
        `/notifications/${backendNotification.backendId}/read`,
        {},
        { auth: true, unwrapData: true }
      );
      await loadBackendNotifications();
      return;
    }

    setNotificationStates((current) => ({
      ...current,
      [notificationId]: {
        ...current[notificationId],
        readAt: current[notificationId]?.readAt ?? new Date().toISOString(),
      },
    }));
  }

  async function handleSnoozeNotification(notificationId: string) {
    const backendNotification = backendNotifications.find(
      (notification) => notification.id === notificationId
    );
    const snoozedUntil = getTomorrowIso();

    if (backendNotification?.backendId) {
      await apiPatch<unknown>(
        `/notifications/${backendNotification.backendId}/snooze`,
        { snoozed_until: snoozedUntil },
        { auth: true, unwrapData: true }
      );
      await loadBackendNotifications();
    } else {
      setNotificationStates((current) => ({
        ...current,
        [notificationId]: {
          ...current[notificationId],
          snoozedUntil,
          readAt: current[notificationId]?.readAt ?? new Date().toISOString(),
        },
      }));
    }

    toast({
      title: "Notification snoozed",
      description: "Θα ξαναεμφανιστεί αύριο.",
      tone: "success",
    });
  }

  async function handleDismissNotification(notificationId: string) {
    const backendNotification = backendNotifications.find(
      (notification) => notification.id === notificationId
    );

    if (backendNotification?.backendId) {
      await apiPatch<unknown>(
        `/notifications/${backendNotification.backendId}/dismiss`,
        {},
        { auth: true, unwrapData: true }
      );
      await loadBackendNotifications();
      return;
    }

    setNotificationStates((current) => ({
      ...current,
      [notificationId]: {
        ...current[notificationId],
        dismissedAt: new Date().toISOString(),
        readAt: current[notificationId]?.readAt ?? new Date().toISOString(),
      },
    }));
  }

  async function handleOpenNotificationTask(notification: TaskNotification) {
    const task = tasks.find((item) => getTaskKey(item) === notification.taskKey);

    if (!task) {
      toast({
        title: "Task not found",
        description: "Το task της ειδοποίησης δεν υπάρχει πλέον στο τρέχον state.",
        tone: "warning",
      });

      return;
    }

    await handleMarkNotificationRead(notification.id);
    void openTaskInPanel(task);
  }

  async function handleMarkAllNotificationsRead() {
    if (taskNotifications.length === 0) return;

    if (settings.dataSourceMode === "Backend API") {
      await apiPatch<unknown>("/notifications/read-all", {}, { auth: true, unwrapData: true });
      await loadBackendNotifications();
    } else {
      const now = new Date().toISOString();

      setNotificationStates((current) => {
        const next = { ...current };

        taskNotifications.forEach((notification) => {
          next[notification.id] = {
            ...next[notification.id],
            readAt: next[notification.id]?.readAt ?? now,
          };
        });

        return next;
      });
    }

    toast({
      title: "Notifications marked as read",
      description: `${taskNotifications.length} reminders ενημερώθηκαν ως read.`,
      tone: "success",
    });
  }

  async function handleResetNotificationStates() {
    if (settings.dataSourceMode === "Backend API") {
      await apiPatch<unknown>("/notifications/reset-states", {}, { auth: true, unwrapData: true });
      await loadBackendNotifications();
    } else {
      setNotificationStates({});
    }

    toast({
      title: "Notifications reset",
      description: "Καθαρίστηκαν read / snooze / dismiss states.",
      tone: "success",
    });
  }

  async function handleSaveTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  
    if (!selectedTask || isSavingTask) return;
  
    const selectedUser = getUserById(editAssigneeUserId);

    const updatedTaskBase: DemoTask = {
      ...selectedTask,
      title: editTitle.trim() || "Untitled task",
      owner: editOwner.trim() || selectedTask.owner || "Admin",
      assigneeUserId: editAssigneeUserId || null,
      assignee: selectedUser,
      status: editStatus,
      priority: editPriority,
      due: editDue,
      notes: editNotes.trim(),
    };

    const updatedTask: DemoTask = withTaskActivity(updatedTaskBase, {
      action: "updated",
      label: "Task updated",
      description: buildTaskUpdateDescription(selectedTask, updatedTaskBase),
      actor: updatedTaskBase.owner,
      tone: "blue",
    });
  
    const shouldSaveToBackend =
      settings.dataSourceMode === "Backend API" &&
      getEffectiveTaskSource(selectedTask) === "Backend" &&
      Boolean(selectedTask.backendId);
  
    if (!shouldSaveToBackend) {
      upsertTaskLocally(updatedTask);
  
      setSelectedTask(updatedTask);
      setEditMode(false);
  
      toast({
        title: "Task updated locally",
        description: `"${updatedTask.title}" ενημερώθηκε στο local state.`,
        tone: "success",
      });
  
      return;
    }
  
    try {
      setIsSavingTask(true);
  
      const payload = await apiPatch<unknown>(
        `/tasks/${selectedTask.backendId}`,
        {
          title: updatedTask.title,
          description: updatedTask.notes ?? "",
          priority: mapTaskPriorityToBackend(updatedTask.priority),
          status: mapTaskStatusToBackend(updatedTask.status),
          due_at: mapTaskDueToBackend(updatedTask.due),
          assignee_user_id: updatedTask.assigneeUserId || null,
        },
        {
          auth: true,
          unwrapData: true,
        }
      );
  
      const normalized = normalizeBackendTasks(payload);
      const normalizedTask = normalized[0];
  
      const backendTask: DemoTask = normalizedTask
        ? {
            ...updatedTask,
            ...normalizedTask,
            owner:
              normalizedTask.owner === "Backend User"
                ? updatedTask.owner
                : normalizedTask.owner,
            assigneeUserId:
              normalizedTask.assigneeUserId ?? updatedTask.assigneeUserId,
            assignee: normalizedTask.assignee ?? updatedTask.assignee,
            localId: selectedTask.localId,
            backendId: selectedTask.backendId,
            source: "Backend",
            title:
              normalizedTask.title.startsWith("Backend task")
                ? updatedTask.title
                : normalizedTask.title,
            notes: normalizedTask.notes?.trim()
              ? normalizedTask.notes
              : updatedTask.notes,
          }
        : {
            ...updatedTask,
            source: "Backend",
          };
  
      upsertTaskLocally(backendTask);
  
      setSelectedTask(backendTask);
      setEditMode(false);
  
      toast({
        title: "Task updated in backend",
        description: `"${backendTask.title}" ενημερώθηκε στο Backend API.`,
        tone: "success",
      });
    } catch (error) {
      toast({
        title: "Backend task update failed",
        description: `${getApiErrorMessage(
          error
        )}. Η φόρμα έμεινε ανοιχτή για να μη χαθούν οι αλλαγές.`,
        tone: "error",
      });
    } finally {
      setIsSavingTask(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tasks"
        title="Tasks & Follow-ups"
        description="Καθαρή εικόνα για εκκρεμότητες, αναθέσεις και ενέργειες που συνδέονται με records ή πελάτες."
        actions={
          <>
            <AppButton
              variant="secondary"
              onClick={handleLoadTasksFromBackend}
              disabled={
                isLoadingBackendTasks || settings.dataSourceMode === "Mock"
              }
            >
              {isLoadingBackendTasks ? "Loading..." : "Load"}
            </AppButton>

            <AppButton onClick={() => setModalOpen(true)}>New Task</AppButton>
          </>
        }
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Workspace metrics</p>
            <p className="mt-1 text-xs text-slate-500">
              Compact εικόνα για το τρέχον view χωρίς να βαραίνει η οθόνη.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowCompactStats((value) => !value)}
            className="inline-flex h-9 items-center justify-center rounded-2xl border border-slate-200 px-3 text-xs font-semibold text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
          >
            {showCompactStats ? "Hide metrics" : "Show metrics"}
          </button>
        </div>

        {showCompactStats ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            {taskStats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 transition hover:border-blue-100 hover:bg-blue-50/40"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="truncate text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    {item.label}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-slate-500 shadow-sm">
                    {item.badge}
                  </span>
                </div>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {item.value}
                </p>
                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-3 2xl:flex-row 2xl:items-center 2xl:justify-between">
            <div className="grid min-w-0 flex-1 gap-2 lg:grid-cols-[minmax(260px,1.25fr)_repeat(4,minmax(150px,0.75fr))]">
              <input
                value={search}
                onChange={(event) => handleSearchFilterChange(event.target.value)}
                placeholder="Search tasks..."
                className="h-11 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
              />

              <select
                value={taskView}
                onChange={(event) => handleTaskViewFilterChange(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="active">Active tasks</option>
                <option value="archived">Archived tasks</option>
                <option value="all">All tasks</option>
              </select>

              <select
                value={statusFilter}
                onChange={(event) => handleStatusFilterChange(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Done">Done</option>
                <option value="Cancelled">Cancelled</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => handlePriorityFilterChange(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="all">All priorities</option>
                <option value="High">High</option>
                <option value="Normal">Normal</option>
                <option value="Low">Low</option>
              </select>

              <select
                value={assigneeFilter}
                onChange={(event) => handleAssigneeFilterChange(event.target.value)}
                className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {assigneeFilterOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => handleTaskLayoutChange("table")}
                  className={[
                    "rounded-xl px-3 py-2 text-xs font-semibold transition",
                    taskLayout === "table"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                >
                  Table
                </button>
                <button
                  type="button"
                  onClick={() => handleTaskLayoutChange("kanban")}
                  className={[
                    "rounded-xl px-3 py-2 text-xs font-semibold transition",
                    taskLayout === "kanban"
                      ? "bg-white text-slate-950 shadow-sm"
                      : "text-slate-500 hover:text-slate-800",
                  ].join(" ")}
                >
                  Kanban
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowNotificationCenter((value) => !value)}
                className={[
                  "inline-flex h-11 items-center gap-2 rounded-2xl border px-3 text-sm font-semibold transition",
                  showNotificationCenter
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
                ].join(" ")}
              >
                🔔
                <span>{unreadNotificationCount}</span>
              </button>

              <select
                value={selectedSavedViewId}
                onChange={(event) => handleApplySavedView(event.target.value)}
                className="h-11 max-w-[220px] rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                <option value="">Saved view...</option>
                {sortedSavedViews.map((view) => (
                  <option key={view.id} value={view.id}>
                    {view.name}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setShowSavedViewsManager((value) => !value)}
                className={[
                  "h-11 rounded-2xl border px-3 text-sm font-semibold transition",
                  showSavedViewsManager
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
                ].join(" ")}
              >
                Manage Views
              </button>

              <button
                type="button"
                onClick={() => setShowAdvancedControls((value) => !value)}
                className={[
                  "h-11 rounded-2xl border px-3 text-sm font-semibold transition",
                  showAdvancedControls
                    ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700",
                ].join(" ")}
              >
                More
              </button>

              <AppButton type="button" variant="ghost" onClick={resetFilters}>
                Reset
              </AppButton>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-2">
              <div className="truncate">
                <span className="font-semibold text-slate-700">Current:</span>{" "}
                {currentSavedView
                  ? `${currentSavedView.name} • ${getSavedViewSummary(currentSavedView)}`
                  : currentFilterSummary}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {activeFilterChips.length > 0 ? (
                  activeFilterChips.map((chip) => (
                    <span
                      key={`${chip.label}-${chip.value}`}
                      className="inline-flex items-center gap-1 rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700"
                    >
                      <span className="text-blue-400">{chip.label}</span>
                      <span>{chip.value}</span>
                    </span>
                  ))
                ) : (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-500">
                    Default active workspace
                  </span>
                )}
              </div>
            </div>

            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {taskLayout === "kanban" ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                  {kanbanGroupBy === "assignee"
                    ? "Kanban ανά χρήστη"
                    : kanbanGroupBy === "priority"
                      ? "Kanban ανά priority"
                      : "Kanban ανά status"}
                </span>
              ) : null}
              <span className="rounded-full bg-slate-100 px-2.5 py-1 font-semibold text-slate-600">
                {filteredTasks.length} shown
              </span>
              {selectedFilteredTaskCount > 0 ? (
                <span className="rounded-full bg-blue-50 px-2.5 py-1 font-semibold text-blue-700">
                  {selectedFilteredTaskCount} selected
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_480px]">
        <div className="min-w-0 space-y-6">
          {showNotificationCenter ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-slate-950">Notifications / Reminders</p>
              <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                {unreadNotificationCount} unread
              </span>
              {snoozedNotificationCount > 0 ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  {snoozedNotificationCount} snoozed
                </span>
              ) : null}
              {isLoadingNotifications ? (
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                  syncing
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {settings.dataSourceMode === "Backend API" ? "Backend persisted reminders ανά χρήστη." : "Αυτόματα reminders από due dates, high priority tasks και tasks χωρίς ανάθεση."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowUnreadOnlyNotifications((value) => !value)}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            >
              {showUnreadOnlyNotifications ? "Show all" : "Unread only"}
            </button>

            <button
              type="button"
              onClick={() => void handleMarkAllNotificationsRead()}
              disabled={taskNotifications.length === 0}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all read
            </button>

            <button
              type="button"
              onClick={() => void handleResetNotificationStates()}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
            >
              Reset states
            </button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {visibleTaskNotifications.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center">
              <p className="text-sm font-semibold text-slate-700">No active reminders</p>
              <p className="mt-1 text-sm text-slate-500">
                Δεν υπάρχουν ενεργές ειδοποιήσεις για το τρέχον task list.
              </p>
            </div>
          ) : (
            visibleTaskNotifications.slice(0, 8).map((notification) => {
              const unread = isNotificationUnread(notification);

              return (
                <div
                  key={notification.id}
                  className={[
                    "flex flex-col gap-3 rounded-2xl border px-4 py-3 transition md:flex-row md:items-center md:justify-between",
                    getNotificationToneClasses(notification.tone),
                    unread ? "shadow-sm" : "opacity-75",
                  ].join(" ")}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={[
                          "h-2.5 w-2.5 rounded-full",
                          unread ? getNotificationDotClass(notification.tone) : "bg-slate-300",
                        ].join(" ")}
                      />
                      <p className="truncate text-sm font-semibold">
                        {notification.title}
                      </p>
                      {unread ? (
                        <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold">
                          New
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm opacity-90">{notification.description}</p>
                    <p className="mt-1 text-xs opacity-70">Task: {notification.taskTitle}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    <button
                      type="button"
                      onClick={() => void handleOpenNotificationTask(notification)}
                      className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                    >
                      Go to task
                    </button>

                    {unread ? (
                      <button
                        type="button"
                        onClick={() => void handleMarkNotificationRead(notification.id)}
                        className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                      >
                        Mark read
                      </button>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleSnoozeNotification(notification.id)}
                      className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                    >
                      Snooze
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleDismissNotification(notification.id)}
                      className="rounded-full bg-white/70 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-white"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
          ) : null}

          {showAdvancedControls ? (
            <>
      <FilterBar
        searchValue={search}
        onSearchChange={handleSearchFilterChange}
        searchPlaceholder="Search tasks by title, owner, assignee, notes ή due date..."
        filters={[
          {
            label: "View",
            value: taskView,
            onChange: handleTaskViewFilterChange,
            options: [
              { label: "Active tasks", value: "active" },
              { label: "Archived tasks", value: "archived" },
              { label: "All tasks", value: "all" },
            ],
          },
          {
            label: "Status",
            value: statusFilter,
            onChange: handleStatusFilterChange,
            options: [
              { label: "All statuses", value: "all" },
              { label: "Open", value: "Open" },
              { label: "In Progress", value: "In Progress" },
              { label: "Done", value: "Done" },
			  { label: "Cancelled", value: "Cancelled" },
            ],
          },
          {
            label: "Priority",
            value: priorityFilter,
            onChange: handlePriorityFilterChange,
            options: [
              { label: "All priorities", value: "all" },
              { label: "Low", value: "Low" },
              { label: "Normal", value: "Normal" },
              { label: "High", value: "High" },
            ],
          },
          {
            label: "Assignee",
            value: assigneeFilter,
            onChange: handleAssigneeFilterChange,
            options: assigneeFilterOptions,
          },
        ]}
      />

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">Board layout</p>
              <p className="mt-1 text-sm text-slate-500">
                Εναλλαγή ανάμεσα σε table, Kanban ανά status, ανά χρήστη και ανά priority.
              </p>
            </div>

            <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
              <button
                type="button"
                onClick={() => handleTaskLayoutChange("table")}
                className={[
                  "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none",
                  taskLayout === "table"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                Table
              </button>

              <button
                type="button"
                onClick={() => handleTaskLayoutChange("kanban")}
                className={[
                  "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none",
                  taskLayout === "kanban"
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-500 hover:text-slate-800",
                ].join(" ")}
              >
                Kanban
              </button>
            </div>
          </div>

          {taskLayout === "kanban" ? (
            <div className="grid gap-4 border-t border-slate-100 pt-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Kanban grouping
                </p>
                <div className="inline-flex w-full rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => handleKanbanGroupByChange("status")}
                    className={[
                      "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none",
                      kanbanGroupBy === "status"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-800",
                    ].join(" ")}
                  >
                    Ανά status
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKanbanGroupByChange("assignee")}
                    className={[
                      "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none",
                      kanbanGroupBy === "assignee"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-800",
                    ].join(" ")}
                  >
                    Ανά χρήστη
                  </button>

                  <button
                    type="button"
                    onClick={() => handleKanbanGroupByChange("priority")}
                    className={[
                      "flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition sm:flex-none",
                      kanbanGroupBy === "priority"
                        ? "bg-white text-slate-950 shadow-sm"
                        : "text-slate-500 hover:text-slate-800",
                    ].join(" ")}
                  >
                    Ανά priority
                  </button>
                </div>
              </div>

              {kanbanGroupBy === "status" ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Εμφανιζόμενα statuses
                    </p>
                    <button
                      type="button"
                      onClick={handleShowAllKanbanStatuses}
                      className="text-xs font-semibold text-blue-600 transition hover:text-blue-700"
                    >
                      Show all
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {kanbanStatuses.map((status) => {
                      const checked = kanbanVisibleStatuses.includes(status);

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleToggleKanbanStatus(status)}
                          className={[
                            "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition",
                            checked
                              ? "border-blue-200 bg-blue-50 text-blue-700"
                              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-800",
                          ].join(" ")}
                          aria-pressed={checked}
                        >
                          <span
                            className={[
                              "h-2.5 w-2.5 rounded-full",
                              checked ? "bg-blue-500" : "bg-slate-300",
                            ].join(" ")}
                          />
                          {status}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : kanbanGroupBy === "assignee" ? (
                <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                  Το Kanban εμφανίζεται σε στήλες ανά assignee, μαζί με στήλη για tasks χωρίς ανάθεση.
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Το Kanban εμφανίζεται σε στήλες ανά priority: High, Normal και Low.
                </div>
              )}
            </div>
          ) : null}
        </div>
      </section>
            </>
          ) : null}

          {showSavedViewsManager ? (
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-950">Saved views</p>
            <p className="mt-1 text-sm text-slate-500">
              {currentSavedView
                ? `${currentSavedView.name} • ${getSavedViewSummary(currentSavedView)}`
                : `Current filters • ${currentFilterSummary}`}
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <select
              value={selectedSavedViewId}
              onChange={(event) => handleApplySavedView(event.target.value)}
              className="h-11 min-w-[220px] rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">Επιλογή saved view...</option>
              {sortedSavedViews.map((view) => (
                <option key={view.id} value={view.id}>
                  {view.name}
                </option>
              ))}
            </select>

            <input
              value={savedViewName}
              onChange={(event) => setSavedViewName(event.target.value)}
              placeholder="Όνομα view π.χ. My Open Tasks"
              className="h-11 min-w-[240px] rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />

            <AppButton type="button" variant="secondary" onClick={handleSaveCurrentView}>
              Save View
            </AppButton>

            <AppButton
              type="button"
              variant="ghost"
              onClick={handleDeleteSavedView}
              disabled={!selectedSavedViewId}
            >
              Delete View
            </AppButton>
          </div>
        </div>
      </section>
          ) : null}

      {hasFilteredTasks ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {selectedFilteredTaskCount > 0
                  ? `${selectedFilteredTaskCount} selected`
                  : "Bulk actions"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {selectedFilteredTaskCount > 0
                  ? "Εφάρμοσε ενέργειες μόνο στα επιλεγμένα tasks του τρέχοντος view."
                  : "Επίλεξε tasks από το checkbox της κάθε γραμμής ή διάλεξε όλα τα filtered tasks."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <AppButton
                type="button"
                variant="secondary"
                onClick={
                  allFilteredTasksSelected
                    ? handleClearFilteredTaskSelection
                    : handleSelectFilteredTasks
                }
                disabled={isSavingTask}
              >
                {allFilteredTasksSelected ? "Unselect View" : "Select View"}
              </AppButton>

              {selectedFilteredTaskCount > 0 ? (
                <>
                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={clearTaskSelection}
                    disabled={isSavingTask}
                  >
                    Clear
                  </AppButton>

                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                    <select
                      value={bulkAssigneeUserId}
                      onChange={(event) => setBulkAssigneeUserId(event.target.value)}
                      disabled={isSavingTask || isLoadingUsers}
                      className="h-10 min-w-[210px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="no-change">Επιλογή assignee...</option>
                      <option value="unassigned">Χωρίς ανάθεση</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {getUserLabel(user)}
                        </option>
                      ))}
                    </select>

                    <AppButton
                      type="button"
                      variant="secondary"
                      onClick={handleBulkAssignTasks}
                      disabled={
                        isSavingTask ||
                        isLoadingUsers ||
                        bulkAssigneeUserId === "no-change"
                      }
                    >
                      Assign
                    </AppButton>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5">
                    <select
                      value={bulkDue}
                      onChange={(event) => setBulkDue(event.target.value)}
                      disabled={isSavingTask}
                      className="h-10 min-w-[210px] rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="no-change">Επιλογή due date...</option>
                      <option value="Σήμερα">Σήμερα</option>
                      <option value="Αύριο">Αύριο</option>
                      <option value="Αυτή την εβδομάδα">Αυτή την εβδομάδα</option>
                      <option value="Χωρίς ημερομηνία">Χωρίς ημερομηνία</option>
                    </select>

                    <AppButton
                      type="button"
                      variant="secondary"
                      onClick={handleBulkDueDateUpdate}
                      disabled={isSavingTask || bulkDue === "no-change"}
                    >
                      Update Due
                    </AppButton>
                  </div>

                  <AppButton
                    type="button"
                    onClick={handleBulkCompleteTasks}
                    disabled={isSavingTask}
                  >
                    {isSavingTask ? "Saving..." : "Complete"}
                  </AppButton>

                  <AppButton
                    type="button"
                    variant="secondary"
                    onClick={() => setConfirmAction("bulk-archive")}
                    disabled={isSavingTask}
                  >
                    Archive
                  </AppButton>

                  <AppButton
                    type="button"
                    variant="ghost"
                    onClick={() => setConfirmAction("bulk-delete")}
                    disabled={isSavingTask}
                  >
                    Delete
                  </AppButton>
                </>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {filteredTasks.length === 0 ? (
        <PageState
          title={
            visibleTasks.length === 0
              ? "Δεν υπάρχουν tasks σε αυτό το view"
              : "Δεν βρέθηκαν tasks με αυτά τα φίλτρα"
          }
          description={
            visibleTasks.length === 0
              ? "Δοκίμασε να αλλάξεις το View σε Active, Archived ή All tasks."
              : "Άλλαξε search, status, priority ή assignee filter για να δεις περισσότερα αποτελέσματα."
          }
          actionLabel="Reset filters"
          onAction={resetFilters}
        />
      ) : taskLayout === "table" ? (
        <DataTable
          columns={columns}
          data={filteredTasks}
          emptyMessage="Δεν υπάρχουν tasks."
          onRowClick={(task) => {
            void openTaskInPanel(task);
          }}
        />
      ) : (
        <section className="grid gap-4 xl:grid-cols-4">
          {kanbanColumns.map((column) => (
            <div
              key={column.id}
              className="flex min-h-[360px] flex-col rounded-3xl border border-slate-200 bg-slate-50 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {kanbanGroupBy === "status" && "status" in column ? (
                    <StatusBadge tone={getStatusTone(column.status)}>
                      {column.title}
                    </StatusBadge>
                  ) : kanbanGroupBy === "priority" && "priority" in column ? (
                    <StatusBadge tone={getPriorityTone(column.priority)}>
                      {column.title}
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone={column.id === "unassigned" ? "amber" : "blue"}>
                      {column.title}
                    </StatusBadge>
                  )}
                  <span className="text-sm font-semibold text-slate-700">
                    {column.tasks.length}
                  </span>
                </div>
              </div>

              {column.tasks.length === 0 ? (
                <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm text-slate-400">
                  Δεν υπάρχουν tasks εδώ.
                </div>
              ) : (
                <div className="space-y-3">
                  {column.tasks.map((task) => {
                    const taskKey = getTaskKey(task);
                    const isSelected = selectedTaskKeys.has(taskKey);
                    const isOpenInPanel = selectedTask
                      ? getTaskKey(selectedTask) === taskKey
                      : false;
                    const isDone = task.status === "Done";
                    const isArchived = Boolean(task.archived);

                    return (
                      <article
                        key={taskKey}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          void openTaskInPanel(task);
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            void openTaskInPanel(task);
                          }
                        }}
                        className={[
                          "rounded-2xl border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md",
                          isOpenInPanel
                            ? "border-blue-400 ring-4 ring-blue-100"
                            : isSelected
                              ? "border-blue-300 ring-4 ring-blue-50"
                              : "border-slate-200",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="line-clamp-2 text-sm font-semibold text-slate-950">
                              {task.title}
                            </h3>
                            <p className="mt-1 text-xs text-slate-500">
                              Created by {task.owner || "System"}
                            </p>
                          </div>

                          <input
                            type="checkbox"
                            checked={isSelected}
                            onClick={(event) => event.stopPropagation()}
                            onChange={(event) => handleToggleTaskSelection(event, task)}
                            aria-label={`Select task ${task.title}`}
                            className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {kanbanGroupBy !== "status" ? (
                            <StatusBadge tone={getStatusTone(task.status)}>
                              {task.status}
                            </StatusBadge>
                          ) : null}
                          <StatusBadge tone={getPriorityTone(task.priority)}>
                            {task.priority}
                          </StatusBadge>
                          <StatusBadge tone={task.archived ? "amber" : "blue"}>
                            {task.archived ? "Archived" : "Active"}
                          </StatusBadge>
                          <StatusBadge
                            tone={
                              getEffectiveTaskSource(task) === "Backend"
                                ? "green"
                                : getEffectiveTaskSource(task) === "Local Draft"
                                  ? "amber"
                                  : "blue"
                            }
                          >
                            {getEffectiveTaskSource(task)}
                          </StatusBadge>
                        </div>

                        <div className="mt-4 space-y-2 text-xs text-slate-500">
                          <div className="flex items-center justify-between gap-3">
                            <span>Assignee</span>
                            <span className="truncate font-medium text-slate-700">
                              {getTaskAssigneeLabel(task)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span>Due</span>
                            <span className="font-medium text-slate-700">{task.due}</span>
                          </div>
                        </div>

                        {task.notes ? (
                          <p className="mt-3 line-clamp-2 text-xs leading-5 text-slate-500">
                            {task.notes}
                          </p>
                        ) : null}

                        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                          <button
                            type="button"
                            onClick={(event) =>
                              handleQuickStatusChange(event, task, isDone ? "Open" : "Done")
                            }
                            disabled={isSavingTask || isArchived}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isDone ? "Reopen" : "Complete"}
                          </button>

                          <button
                            type="button"
                            onClick={(event) => handleQuickEditTask(event, task)}
                            disabled={isSavingTask}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

        </div>

        <aside className="min-w-0 xl:sticky xl:top-6 xl:self-start">
          <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/60">
            {selectedTask ? (
              <div className="flex max-h-none flex-col xl:max-h-[calc(100vh-8rem)]">
                <div className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                        {editMode ? "Edit Task" : "Task Workspace"}
                      </p>
                      <h2 className="mt-2 line-clamp-2 text-lg font-semibold text-slate-950">
                        {selectedTask.title}
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
Selected task workspace με γρήγορα στοιχεία, actions και tabs.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={closeDrawer}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                      aria-label="Close task panel"
                    >
                      ×
                    </button>
                  </div>

                  {!editMode ? (
                    <div className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4 xl:grid-cols-2 2xl:grid-cols-4">
                      <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                        <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Status</p>
                        <div className="mt-1"><StatusBadge tone={getStatusTone(selectedTask.status)}>{selectedTask.status}</StatusBadge></div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                        <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Priority</p>
                        <div className="mt-1"><StatusBadge tone={getPriorityTone(selectedTask.priority)}>{selectedTask.priority}</StatusBadge></div>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                        <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Due</p>
                        <p className="mt-1 truncate font-semibold text-slate-700">{selectedTask.due}</p>
                      </div>
                      <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2">
                        <p className="font-semibold uppercase tracking-[0.12em] text-slate-400">Assignee</p>
                        <p className="mt-1 truncate font-semibold text-slate-700">{getTaskAssigneeLabel(selectedTask)}</p>
                      </div>
                    </div>
                  ) : null}

                  {!editMode ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      {selectedTask.archived ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirmAction("delete")}
                            disabled={isSavingTask}
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>

                          <button
                            type="button"
                            onClick={handleRestoreTask}
                            disabled={isSavingTask}
                            className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Restore Task
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => setConfirmAction("delete")}
                            disabled={isSavingTask}
                            className="rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Delete
                          </button>

                          <button
                            type="button"
                            onClick={() => setConfirmAction("archive")}
                            disabled={isSavingTask}
                            className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-200 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Archive
                          </button>

                          {selectedTask.status === "Done" ? (
                            <button
                              type="button"
                              onClick={handleReopenTask}
                              disabled={isSavingTask}
                              className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSavingTask ? "Saving..." : "Reopen"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={handleCompleteTask}
                              disabled={isSavingTask}
                              className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isSavingTask ? "Saving..." : "Complete"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={startEditTask}
                            disabled={isSavingTask}
                            className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Edit Task
                          </button>
                        </>
                      )}
                    </div>
                  ) : null}

                  {!editMode ? (
                    <div className="mt-5 grid grid-cols-4 gap-1 rounded-2xl bg-slate-100 p-1">
                      {([
                        { id: "details", label: "Details", count: null },
                        { id: "comments", label: "Comments", count: getTaskComments(selectedTask).length },
                        { id: "attachments", label: "Files", count: getTaskAttachments(selectedTask).length },
                        { id: "activity", label: "Activity", count: getTaskActivityEvents(selectedTask).length },
                      ] as const).map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setTaskDetailTab(tab.id)}
                          className={[
                            "rounded-xl px-2 py-2 text-xs font-semibold transition",
                            taskDetailTab === tab.id
                              ? "bg-white text-slate-950 shadow-sm"
                              : "text-slate-500 hover:text-slate-800",
                          ].join(" ")}
                        >
                          <span>{tab.label}</span>
                          {tab.count !== null ? (
                            <span className="ml-1 text-[11px] text-slate-400">{tab.count}</span>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <div className="flex-1 overflow-y-auto p-5">
                  {editMode ? (
                    <form onSubmit={handleSaveTask} className="space-y-5">
                      <TextInput
                        label="Task title"
                        value={editTitle}
                        onChange={(event) => setEditTitle(event.target.value)}
                        required
                      />

                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-semibold text-slate-700">
                            Assignee
                          </label>
                          <select
                            value={editAssigneeUserId}
                            onChange={(event) => {
                              const nextUserId = event.target.value;
                              setEditAssigneeUserId(nextUserId);
                            }}
                            disabled={isLoadingUsers || settings.dataSourceMode === "Mock"}
                            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">
                              {settings.dataSourceMode === "Mock"
                                ? "Χωρίς ανάθεση"
                                : isLoadingUsers
                                  ? "Φόρτωση χρηστών..."
                                  : "Χωρίς ανάθεση"}
                            </option>

                            {users.map((user) => (
                              <option key={user.id} value={user.id}>
                                {getUserLabel(user)}
                              </option>
                            ))}
                          </select>
                        </div>

                        <SelectInput
                          label="Due"
                          value={editDue}
                          onChange={(event) => setEditDue(event.target.value)}
                          options={[
                            "Σήμερα",
                            "Αύριο",
                            "Αυτή την εβδομάδα",
                            "Χωρίς ημερομηνία",
                          ]}
                        />
                      </div>

                      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <SelectInput
                          label="Status"
                          value={editStatus}
                          onChange={(event) =>
                            setEditStatus(event.target.value as TaskStatus)
                          }
                          options={["Open", "In Progress", "Done"]}
                        />

                        <SelectInput
                          label="Priority"
                          value={editPriority}
                          onChange={(event) =>
                            setEditPriority(event.target.value as TaskPriority)
                          }
                          options={["Low", "Normal", "High"]}
                        />
                      </div>

                      <TextArea
                        label="Notes"
                        value={editNotes}
                        onChange={(event) => setEditNotes(event.target.value)}
                        placeholder="Σημειώσεις αλλαγής..."
                      />

                      <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end xl:flex-col-reverse 2xl:flex-row">
                        <AppButton variant="secondary" onClick={cancelEditTask}>
                          Cancel Edit
                        </AppButton>

                        <AppButton type="submit" disabled={isSavingTask}>
                          {isSavingTask
                            ? "Saving..."
                            : selectedTask &&
                                settings.dataSourceMode === "Backend API" &&
                                getEffectiveTaskSource(selectedTask) === "Backend"
                              ? "Save to Backend"
                              : "Save Changes"}
                        </AppButton>
                      </div>
                    </form>
                  ) : taskDetailTab === "details" ? (
                    <div className="space-y-5">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-medium text-slate-500">Status</p>
                          <div className="mt-2">
                            <StatusBadge tone={getStatusTone(selectedTask.status)}>
                              {selectedTask.status}
                            </StatusBadge>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-medium text-slate-500">Priority</p>
                          <div className="mt-2">
                            <StatusBadge tone={getPriorityTone(selectedTask.priority)}>
                              {selectedTask.priority}
                            </StatusBadge>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-medium text-slate-500">State</p>
                          <div className="mt-2">
                            <StatusBadge tone={selectedTask.archived ? "amber" : "blue"}>
                              {selectedTask.archived ? "Archived" : "Active"}
                            </StatusBadge>
                          </div>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <p className="text-xs font-medium text-slate-500">Source</p>
                          <div className="mt-2">
                            {(() => {
                              const source = getEffectiveTaskSource(selectedTask);
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
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-medium text-slate-500">Created by</p>
                          <p className="mt-2 font-semibold text-slate-950">{selectedTask.owner}</p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-medium text-slate-500">Assignee</p>
                          <p className="mt-2 font-semibold text-slate-950">
                            {getTaskAssigneeLabel(selectedTask)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-medium text-slate-500">Due</p>
                          <p className="mt-2 font-semibold text-slate-950">{selectedTask.due}</p>
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white p-4">
                        <p className="text-xs font-medium text-slate-500">Notes</p>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                          {selectedTask.notes?.trim()
                            ? selectedTask.notes
                            : "Δεν υπάρχουν σημειώσεις για αυτό το task."}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                          Context
                        </p>
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          Στο live στάδιο εδώ θα φαίνεται με ποιο record, account ή integration συνδέεται το task.
                        </p>
                      </div>
                    </div>
                  ) : taskDetailTab === "attachments" ? (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Attachments</p>
                          <p className="mt-1 text-xs text-slate-400">
                            PDF, εικόνες, Excel/CSV, Word και text files με ασφαλή limits και preview όπου υποστηρίζεται.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <StatusBadge tone="slate">
                            {getTaskAttachments(selectedTask).length} files
                          </StatusBadge>

                          <label
                            htmlFor="task-attachments-input"
                            className="inline-flex cursor-pointer items-center justify-center rounded-2xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
                          >
                            Add Files
                          </label>

                          <input
                            id="task-attachments-input"
                            type="file"
                            multiple
                            accept={TASK_FILE_ACCEPT}
                            className="hidden"
                            onChange={handleAddTaskAttachments}
                          />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-6 text-blue-900">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">Allowed:</span>
                          <span>PDF έως 25MB</span>
                          <span>· Images έως 10MB</span>
                          <span>· Excel/CSV έως 25MB</span>
                          <span>· Word έως 25MB</span>
                          <span>· Text έως 5MB</span>
                        </div>
                        {uploadProgressLabel ? (
                          <p className="mt-2 font-medium text-blue-700">{uploadProgressLabel}</p>
                        ) : null}
                      </div>

                      {filePreview ? (
                        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-950">
                                Preview: {filePreview.fileName}
                              </p>
                              <p className="text-xs text-slate-500">{filePreview.mimeType}</p>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => window.open(filePreview.objectUrl, "_blank", "noopener,noreferrer")}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Open
                              </button>
                              <button
                                type="button"
                                onClick={closeFilePreview}
                                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                Close
                              </button>
                            </div>
                          </div>

                          <div className="bg-slate-50 p-3">
                            {filePreview.mimeType.startsWith("image/") ? (
                              <img
                                src={filePreview.objectUrl}
                                alt={filePreview.fileName}
                                className="max-h-[360px] w-full rounded-xl object-contain"
                              />
                            ) : filePreview.mimeType === "application/pdf" ? (
                              <iframe
                                src={filePreview.objectUrl}
                                title={filePreview.fileName}
                                className="h-[420px] w-full rounded-xl bg-white"
                              />
                            ) : filePreview.mimeType === "text/plain" ? (
                              <iframe
                                src={filePreview.objectUrl}
                                title={filePreview.fileName}
                                className="h-[300px] w-full rounded-xl bg-white"
                              />
                            ) : (
                              <p className="text-sm text-slate-500">
                                Preview is not available for this file type.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        {getTaskAttachments(selectedTask).length > 0 ? (
                          getTaskAttachments(selectedTask).map((attachment) => (
                            <div
                              key={attachment.id}
                              className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between xl:flex-col xl:items-stretch 2xl:flex-row 2xl:items-center"
                            >
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {attachment.fileName}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatFileSize(attachment.sizeBytes)} · {attachment.mimeType || "unknown"}{isPreviewableTaskAttachment(attachment) ? " · Preview available" : ""}
                                </p>
                                <p className="mt-1 text-xs text-slate-400">
                                  Uploaded by {attachment.uploadedBy} · {formatActivityDate(attachment.uploadedAt)}
                                </p>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {settings.dataSourceMode === "Backend API" &&
                                getEffectiveTaskSource(selectedTask) === "Backend" &&
                                selectedTask.backendId &&
                                isPreviewableTaskAttachment(attachment) ? (
                                  <button
                                    type="button"
                                    onClick={() => handlePreviewTaskAttachment(attachment)}
                                    className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                                  >
                                    Preview
                                  </button>
                                ) : null}

                                {settings.dataSourceMode === "Backend API" &&
                                getEffectiveTaskSource(selectedTask) === "Backend" &&
                                selectedTask.backendId ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDownloadTaskAttachment(attachment)}
                                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                                  >
                                    Download
                                  </button>
                                ) : null}

                                <button
                                  type="button"
                                  onClick={() => handleRemoveTaskAttachment(attachment.id)}
                                  className="inline-flex items-center justify-center rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                            Δεν υπάρχουν ακόμα attachments. Πρόσθεσε PDF, Excel, εικόνες ή άλλα αρχεία για να κρατήσεις όλο το context στο task.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : taskDetailTab === "comments" ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Comments / Internal Notes</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Thread ενημερώσεων για την πραγματική πορεία του task.
                          </p>
                        </div>

                        <StatusBadge tone="slate">
                          {getTaskComments(selectedTask).length} comments
                        </StatusBadge>
                      </div>

                      <form onSubmit={handleAddTaskComment} className="space-y-3">
                        <TextArea
                          label="New internal note"
                          value={newCommentBody}
                          onChange={(event) => setNewCommentBody(event.target.value)}
                          placeholder="π.χ. Μίλησα με τον πελάτη, περιμένουμε απάντηση μέχρι αύριο..."
                        />

                        <div className="flex justify-end">
                          <AppButton type="submit" disabled={!newCommentBody.trim()}>
                            Add Comment
                          </AppButton>
                        </div>
                      </form>

                      <div className="space-y-3">
                        {getTaskComments(selectedTask).length > 0 ? (
                          getTaskComments(selectedTask).map((comment) => (
                            <div key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                              <div className="flex flex-wrap items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-slate-950">
                                  {comment.author}
                                </span>

                                <span className="text-xs font-medium text-slate-400">
                                  {formatActivityDate(comment.createdAt)}
                                </span>
                              </div>

                              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                {comment.body}
                              </p>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-500">
                            Δεν υπάρχουν ακόμα comments. Πρόσθεσε το πρώτο internal note για να κρατήσεις context στο task.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-700">Activity</p>
                          <p className="mt-1 text-xs text-slate-400">
                            Audit trail για τις βασικές αλλαγές αυτού του task.
                          </p>
                        </div>

                        <StatusBadge tone="slate">
                          {getTaskActivityEvents(selectedTask).length} events
                        </StatusBadge>
                      </div>

                      <div className="space-y-3">
                        {getTaskActivityEvents(selectedTask).map((event) => (
                          <div key={event.id} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-center gap-2">
                                <StatusBadge tone={event.tone}>{event.label}</StatusBadge>
                                <span className="text-xs font-medium text-slate-400">
                                  {formatActivityDate(event.createdAt)}
                                </span>
                              </div>

                              <span className="text-xs font-semibold text-slate-500">
                                {event.actor}
                              </span>
                            </div>

                            <p className="mt-3 text-sm leading-6 text-slate-600">
                              {event.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[520px] flex-col items-center justify-center p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-blue-50 text-2xl">
                  ⌁
                </div>
                <h2 className="mt-5 text-lg font-semibold text-slate-950">
                  Επίλεξε task
                </h2>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  Πάτα μια γραμμή στο table ή μια κάρτα στο Kanban για να ανοίξει εδώ το detail workspace.
                </p>
                <div className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-left text-xs leading-5 text-slate-500">
                  Το panel κρατάει τα details, comments, attachments και activity δίπλα στη λίστα, ώστε να μην χάνεις context.
                </div>
              </div>
            )}
          </section>
        </aside>
      </div>

      <AppModal
        open={modalOpen}
        title="New Task"
        description="Δημιουργία νέας εργασίας με τίτλο, σημειώσεις, προτεραιότητα, due date και ανάθεση χρήστη όπου υπάρχει Backend API."
        onClose={closeModal}
      >
        <form onSubmit={handleCreateTask} className="space-y-5">
          <TextInput
            label="Task title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="π.χ. Validate customer import"
            required
          />

          <div className="grid gap-5 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                Assignee
              </label>
              <select
                value={assigneeUserId}
                onChange={(event) => {
                  const nextUserId = event.target.value;

                  setAssigneeUserId(nextUserId);
                }}
                disabled={isLoadingUsers || settings.dataSourceMode === "Mock"}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
              >
                <option value="">
                  {settings.dataSourceMode === "Mock"
                    ? "Χωρίς ανάθεση"
                    : isLoadingUsers
                      ? "Φόρτωση χρηστών..."
                      : "Χωρίς ανάθεση"}
                </option>

                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {getUserLabel(user)}
                  </option>
                ))}
              </select>
            </div>

            <SelectInput
              label="Due"
              value={due}
              onChange={(event) => setDue(event.target.value)}
              options={[
                "Σήμερα",
                "Αύριο",
                "Αυτή την εβδομάδα",
                "Χωρίς ημερομηνία",
              ]}
            />
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <SelectInput
              label="Status"
              value={status}
              onChange={(event) => setStatus(event.target.value as TaskStatus)}
              options={["Open", "In Progress", "Done"]}
            />

            <SelectInput
              label="Priority"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as TaskPriority)
              }
              options={["Low", "Normal", "High"]}
            />
          </div>

          <TextArea
            label="Notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Προαιρετικές σημειώσεις για την εργασία..."
          />

		  <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
		  <AppButton variant="secondary" onClick={closeModal}>
		  	Cancel
		  </AppButton>
		  
		  {canSaveTaskAsLocalDraft ? (
		  	<AppButton
		  	type="button"
		  	variant="secondary"
		  	onClick={handleSaveTaskAsLocalDraft}
		  	disabled={isSavingTask}
		  	>
		  	Save as Local Draft
		  	</AppButton>
		  ) : null}
		  
		  <AppButton type="submit" disabled={isSavingTask}>
		  	{isSavingTask
		  	? "Saving..."
		  	: settings.dataSourceMode === "Backend API"
		  		? "Save to Backend"
		  		: "Create Task"}
		  </AppButton>
		  </div>
        </form>
      </AppModal>


      <ConfirmDialog
        open={confirmAction === "archive"}
        tone="warning"
        title="Archive task?"
        description={`Το task "${
          selectedTask?.title || ""
        }" θα αφαιρεθεί από την ενεργή λίστα, αλλά δεν θα διαγραφεί οριστικά.`}
        confirmLabel="Archive Task"
        onClose={() => setConfirmAction(null)}
        onConfirm={handleArchiveTask}
      />

      <ConfirmDialog
        open={confirmAction === "delete"}
        tone="danger"
        title="Delete task?"
        description={`Το task "${
          selectedTask?.title || ""
        }" θα διαγραφεί από το demo state. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί μέσα από το UI.`}
        confirmLabel="Delete Task"
        onClose={() => setConfirmAction(null)}
        onConfirm={handleDeleteTask}
      />

      <ConfirmDialog
        open={confirmAction === "bulk-archive"}
        tone="warning"
        title="Archive selected tasks?"
        description={`${selectedFilteredTaskCount} selected tasks θα αφαιρεθούν από την ενεργή λίστα, αλλά δεν θα διαγραφούν οριστικά.`}
        confirmLabel="Archive Selected"
        onClose={() => setConfirmAction(null)}
        onConfirm={handleBulkArchiveTasks}
      />

      <ConfirmDialog
        open={confirmAction === "bulk-delete"}
        tone="danger"
        title="Delete selected tasks?"
        description={`${selectedFilteredTaskCount} selected tasks θα διαγραφούν. Αυτή η ενέργεια δεν μπορεί να αναιρεθεί μέσα από το UI.`}
        confirmLabel="Delete Selected"
        onClose={() => setConfirmAction(null)}
        onConfirm={handleBulkDeleteTasks}
      />
    </div>
  );
}