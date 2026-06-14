export const LOUKPERI_PERMISSIONS = {
  TASKS_VIEW: 'operations.tasks.view',
  TASKS_CREATE: 'operations.tasks.create',
  TASKS_UPDATE: 'operations.tasks.update',
  TASKS_ASSIGN: 'operations.tasks.assign',
  TASKS_COMPLETE: 'operations.tasks.complete',
  TASKS_DELETE: 'operations.tasks.delete',
  TASKS_COMMENTS_CREATE: 'operations.tasks.comments.create',
  TASKS_FILES_UPLOAD: 'operations.tasks.files.upload',
  TASKS_FILES_DELETE: 'operations.tasks.files.delete',
  TASKS_ACTIVITY_VIEW: 'operations.tasks.activity.view',
  NOTIFICATIONS_VIEW: 'operations.notifications.view',
  NOTIFICATIONS_MANAGE: 'operations.notifications.manage',
} as const;

export type LoukperiPermission =
  (typeof LOUKPERI_PERMISSIONS)[keyof typeof LOUKPERI_PERMISSIONS];
