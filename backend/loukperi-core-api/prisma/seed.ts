import { Prisma, PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const DEFAULT_PASSWORD = 'ChangeMe123!';

const IDS = {
  accountAcme: '00000000-0000-4000-8000-00000000ac01',
  contactMaria: '00000000-0000-4000-8000-00000000c001',

  recordOne: '00000000-0000-4000-8000-000000000101',
  recordTwo: '00000000-0000-4000-8000-000000000102',
  recordThree: '00000000-0000-4000-8000-000000000103',

  taskOne: '00000000-0000-4000-8000-00000000a101',
  taskTwo: '00000000-0000-4000-8000-00000000a102',
  taskThree: '00000000-0000-4000-8000-00000000a103',

  reportOverview: '00000000-0000-4000-8000-00000000b101',
  reportPriority: '00000000-0000-4000-8000-00000000b102',
  reportRecentTable: '00000000-0000-4000-8000-00000000b103',

  savedViewOpen: '00000000-0000-4000-8000-00000000d101',
  savedViewAssigned: '00000000-0000-4000-8000-00000000d102',

  dashboardMain: '00000000-0000-4000-8000-00000000e101',
  widgetStatus: '00000000-0000-4000-8000-00000000e201',
  widgetPriority: '00000000-0000-4000-8000-00000000e202',
  widgetTasks: '00000000-0000-4000-8000-00000000e203',
  widgetActivity: '00000000-0000-4000-8000-00000000e204',
  widgetNotifications: '00000000-0000-4000-8000-00000000e205',
};

const permissionCatalog: Array<[string, string, string, string]> = [
  ['workspace.read', 'Read workspace', 'Προβολή στοιχείων workspace', 'workspace'],
  ['workspace.update', 'Update workspace', 'Ενημέρωση workspace settings', 'workspace'],

  ['users.read', 'Read users', 'Προβολή χρηστών', 'users'],
  ['users.create', 'Create users', 'Δημιουργία χρηστών', 'users'],
  ['users.update', 'Update users', 'Ενημέρωση χρηστών', 'users'],

  ['roles.read', 'Read roles', 'Προβολή ρόλων', 'roles'],
  ['roles.create', 'Create roles', 'Δημιουργία ρόλων', 'roles'],
  ['roles.update', 'Update roles', 'Ενημέρωση ρόλων', 'roles'],
  ['roles.assign', 'Assign roles', 'Ανάθεση ρόλων', 'roles'],

  ['accounts.read', 'Read accounts', 'Προβολή accounts', 'accounts'],
  ['accounts.create', 'Create accounts', 'Δημιουργία accounts', 'accounts'],
  ['accounts.update', 'Update accounts', 'Ενημέρωση accounts', 'accounts'],

  ['contacts.read', 'Read contacts', 'Προβολή contacts', 'contacts'],
  ['contacts.create', 'Create contacts', 'Δημιουργία contacts', 'contacts'],
  ['contacts.update', 'Update contacts', 'Ενημέρωση contacts', 'contacts'],

  ['records.read', 'Read records', 'Προβολή records', 'records'],
  ['records.create', 'Create records', 'Δημιουργία records', 'records'],
  ['records.update', 'Update records', 'Ενημέρωση records', 'records'],
  ['records.assign', 'Assign records', 'Ανάθεση records', 'records'],
  ['records.change_status', 'Change record status', 'Αλλαγή status records', 'records'],
  ['records.export', 'Export records', 'Εξαγωγή records', 'records'],

  ['tasks.read', 'Read tasks', 'Προβολή tasks', 'tasks'],
  ['tasks.create', 'Create tasks', 'Δημιουργία tasks', 'tasks'],
  ['tasks.update', 'Update tasks', 'Ενημέρωση tasks', 'tasks'],
  ['tasks.complete', 'Complete tasks', 'Ολοκλήρωση tasks', 'tasks'],

  ['reports.read', 'Read reports', 'Προβολή reports', 'reports'],
  ['reports.create', 'Create reports', 'Δημιουργία reports', 'reports'],
  ['reports.export', 'Export reports', 'Εξαγωγή reports', 'reports'],

  ['notifications.read', 'Read notifications', 'Προβολή notifications', 'notifications'],
  ['notifications.manage', 'Manage notifications', 'Διαχείριση notifications', 'notifications'],
];

const roleDefinitions = [
  {
    code: 'client_admin',
    name: 'Client Admin',
    permissions: permissionCatalog.map(([code]) => code),
  },
  {
    code: 'manager',
    name: 'Manager',
    permissions: [
      'workspace.read',
      'accounts.read',
      'accounts.create',
      'accounts.update',
      'contacts.read',
      'contacts.create',
      'contacts.update',
      'records.read',
      'records.create',
      'records.update',
      'records.assign',
      'records.change_status',
      'records.export',
      'tasks.read',
      'tasks.create',
      'tasks.update',
      'tasks.complete',
      'reports.read',
      'reports.create',
      'reports.export',
      'notifications.read',
    ],
  },
  {
    code: 'operator',
    name: 'Operator',
    permissions: [
      'workspace.read',
      'accounts.read',
      'contacts.read',
      'records.read',
      'records.create',
      'records.update',
      'tasks.read',
      'tasks.create',
      'tasks.update',
      'tasks.complete',
      'notifications.read',
    ],
  },
  {
    code: 'viewer',
    name: 'Viewer',
    permissions: [
      'workspace.read',
      'accounts.read',
      'contacts.read',
      'records.read',
      'tasks.read',
      'reports.read',
      'notifications.read',
    ],
  },
];

async function upsertPermissions() {
  for (const [code, name, description, module] of permissionCatalog) {
    await prisma.permission.upsert({
      where: { code },
      update: { name, description, module },
      create: { code, name, description, module },
    });
  }
}

async function upsertDemoUser(params: {
  workspaceId: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  roleCode: string;
  isOwner?: boolean;
}) {
  const user = await prisma.user.upsert({
    where: { email: params.email },
    update: {
      firstName: params.firstName,
      lastName: params.lastName,
      isActive: true,
    },
    create: {
      email: params.email,
      passwordHash: await argon2.hash(DEFAULT_PASSWORD),
      firstName: params.firstName,
      lastName: params.lastName,
      isActive: true,
    },
  });

  const workspaceUser = await prisma.workspaceUser.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: params.workspaceId,
        userId: user.id,
      },
    },
    update: {
      status: 'active',
      isOwner: params.isOwner ?? false,
      jobTitle: params.jobTitle,
    },
    create: {
      workspaceId: params.workspaceId,
      userId: user.id,
      status: 'active',
      isOwner: params.isOwner ?? false,
      jobTitle: params.jobTitle,
    },
  });

  const role = await prisma.role.findUniqueOrThrow({
    where: {
      workspaceId_code: {
        workspaceId: params.workspaceId,
        code: params.roleCode,
      },
    },
  });

  await prisma.workspaceUserRole.upsert({
    where: {
      workspaceId_workspaceUserId_roleId: {
        workspaceId: params.workspaceId,
        workspaceUserId: workspaceUser.id,
        roleId: role.id,
      },
    },
    update: {},
    create: {
      workspaceId: params.workspaceId,
      workspaceUserId: workspaceUser.id,
      roleId: role.id,
    },
  });

  return { user, workspaceUser };
}

async function upsertRoles(workspaceId: string) {
  for (const roleDefinition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: {
        workspaceId_code: {
          workspaceId,
          code: roleDefinition.code,
        },
      },
      update: {
        name: roleDefinition.name,
        isSystemRole: true,
      },
      create: {
        workspaceId,
        code: roleDefinition.code,
        name: roleDefinition.name,
        isSystemRole: true,
      },
    });

    const permissions = await prisma.permission.findMany({
      where: {
        code: {
          in: roleDefinition.permissions,
        },
      },
      select: {
        id: true,
      },
    });

    await prisma.rolePermission.deleteMany({
      where: {
        workspaceId,
        roleId: role.id,
      },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((permission) => ({
        workspaceId,
        roleId: role.id,
        permissionId: permission.id,
      })),
      skipDuplicates: true,
    });
  }
}

async function upsertAccountByCode(params: {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  code: string;
  name: string;
}) {
  const existing = await prisma.account.findFirst({
    where: {
      workspaceId: params.workspaceId,
      code: params.code,
    },
  });

  const data = {
    workspaceId: params.workspaceId,
    name: params.name,
    code: params.code,
    accountType: 'customer',
    email: 'info@acme.test',
    phone: '+30 2100000000',
    city: 'Athens',
    country: 'GR',
    status: 'active',
    ownerUserId: params.ownerUserId,
    metadataJsonb: { tier: 'gold' },
  };

  if (existing) {
    return prisma.account.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.account.create({
    data: {
      id: params.id,
      ...data,
    },
  });
}

async function upsertContactByEmail(params: {
  id: string;
  workspaceId: string;
  accountId: string;
  email: string;
}) {
  const existing = await prisma.contact.findFirst({
    where: {
      workspaceId: params.workspaceId,
      accountId: params.accountId,
      email: params.email,
    },
  });

  const data = {
    workspaceId: params.workspaceId,
    accountId: params.accountId,
    firstName: 'Maria',
    lastName: 'Papadopoulou',
    email: params.email,
    phone: '+30 6990000000',
    jobTitle: 'Operations Manager',
    isPrimary: true,
    status: 'active',
    metadataJsonb: {},
  };

  if (existing) {
    return prisma.contact.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.contact.create({
    data: {
      id: params.id,
      ...data,
    },
  });
}

async function upsertRecordByCode(params: {
  id: string;
  workspaceId: string;
  recordTypeId: string;
  accountId: string;
  contactId: string;
  code: string;
  title: string;
  description: string;
  statusId: string;
  priority: string;
  ownerUserId: string;
  assigneeUserId: string;
  dataJson: Prisma.InputJsonValue;
}) {
  const existing = await prisma.record.findFirst({
    where: {
      workspaceId: params.workspaceId,
      code: params.code,
    },
  });

  const data = {
    workspaceId: params.workspaceId,
    recordTypeId: params.recordTypeId,
    accountId: params.accountId,
    contactId: params.contactId,
    title: params.title,
    code: params.code,
    description: params.description,
    statusId: params.statusId,
    priority: params.priority,
    ownerUserId: params.ownerUserId,
    assigneeUserId: params.assigneeUserId,
    dataJson: params.dataJson,
  };

  if (existing) {
    return prisma.record.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.record.create({
    data: {
      id: params.id,
      ...data,
    },
  });
}

async function upsertTask(params: {
  id: string;
  workspaceId: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigneeUserId: string;
  createdByUserId: string;
  relatedEntityId: string;
  dueAt?: Date;
}) {
  const existing = await prisma.task.findFirst({
    where: {
      workspaceId: params.workspaceId,
      title: params.title,
      relatedEntityType: 'record',
      relatedEntityId: params.relatedEntityId,
    },
  });

  const data = {
    workspaceId: params.workspaceId,
    title: params.title,
    description: params.description,
    status: params.status,
    priority: params.priority,
    assigneeUserId: params.assigneeUserId,
    createdByUserId: params.createdByUserId,
    relatedEntityType: 'record',
    relatedEntityId: params.relatedEntityId,
    dueAt: params.dueAt,
  };

  if (existing) {
    return prisma.task.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.task.create({
    data: {
      id: params.id,
      ...data,
    },
  });
}

async function upsertSavedReport(params: {
  id: string;
  workspaceId: string;
  name: string;
  entityType: string;
  reportType: string;
  definitionJsonb: Prisma.InputJsonValue;
  createdByUserId: string;
}) {
  const existing = await prisma.savedReport.findFirst({
    where: {
      workspaceId: params.workspaceId,
      name: params.name,
    },
  });

  const data = {
    workspaceId: params.workspaceId,
    name: params.name,
    entityType: params.entityType,
    reportType: params.reportType,
    definitionJsonb: params.definitionJsonb,
    isSystem: true,
    createdByUserId: params.createdByUserId,
  };

  if (existing) {
    return prisma.savedReport.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.savedReport.create({
    data: {
      id: params.id,
      ...data,
    },
  });
}

async function upsertSavedView(params: {
  id: string;
  workspaceId: string;
  entityType: string;
  name: string;
  isDefault: boolean;
  visibility: string;
  createdByUserId: string;
  filtersJsonb: Prisma.InputJsonValue;
  columnsJsonb: Prisma.InputJsonValue;
  sortingJsonb: Prisma.InputJsonValue;
}) {
  const existing = await prisma.savedView.findFirst({
    where: {
      workspaceId: params.workspaceId,
      entityType: params.entityType,
      name: params.name,
      createdByUserId: params.createdByUserId,
    },
  });

  const data = {
    workspaceId: params.workspaceId,
    entityType: params.entityType,
    name: params.name,
    isDefault: params.isDefault,
    visibility: params.visibility,
    createdByUserId: params.createdByUserId,
    filtersJsonb: params.filtersJsonb,
    columnsJsonb: params.columnsJsonb,
    sortingJsonb: params.sortingJsonb,
  };

  if (existing) {
    return prisma.savedView.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.savedView.create({
    data: {
      id: params.id,
      ...data,
    },
  });
}

async function upsertDashboard(params: {
  id: string;
  workspaceId: string;
  name: string;
  scopeType: string;
  scopeId?: string | null;
  isDefault: boolean;
}) {
  const existing = await prisma.dashboardConfig.findFirst({
    where: {
      workspaceId: params.workspaceId,
      name: params.name,
      scopeType: params.scopeType,
      scopeId: params.scopeId ?? null,
    },
  });

  const data = {
    workspaceId: params.workspaceId,
    name: params.name,
    scopeType: params.scopeType,
    scopeId: params.scopeId ?? null,
    isDefault: params.isDefault,
  };

  if (params.isDefault) {
    await prisma.dashboardConfig.updateMany({
      where: {
        workspaceId: params.workspaceId,
        scopeType: params.scopeType,
        scopeId: params.scopeId ?? null,
        isDefault: true,
      },
      data: {
        isDefault: false,
      },
    });
  }

  if (existing) {
    return prisma.dashboardConfig.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.dashboardConfig.create({
    data: {
      id: params.id,
      ...data,
    },
  });
}

async function upsertDashboardWidget(params: {
  id: string;
  workspaceId: string;
  dashboardConfigId: string;
  widgetType: string;
  title: string;
  positionX: number;
  positionY: number;
  width: number;
  height: number;
  settingsJsonb: Prisma.InputJsonValue;
}) {
  const existing = await prisma.dashboardWidget.findFirst({
    where: {
      workspaceId: params.workspaceId,
      dashboardConfigId: params.dashboardConfigId,
      widgetType: params.widgetType,
      title: params.title,
    },
  });

  const data = {
    workspaceId: params.workspaceId,
    dashboardConfigId: params.dashboardConfigId,
    widgetType: params.widgetType,
    title: params.title,
    positionX: params.positionX,
    positionY: params.positionY,
    width: params.width,
    height: params.height,
    settingsJsonb: params.settingsJsonb,
  };

  if (existing) {
    return prisma.dashboardWidget.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.dashboardWidget.create({
    data: {
      id: params.id,
      ...data,
    },
  });
}

async function main(): Promise<void> {
  await upsertPermissions();

  const workspace = await prisma.workspace.upsert({
    where: {
      slug: 'demo-client',
    },
    update: {
      name: 'Demo Client',
      companyName: 'Demo Client SA',
      timezone: 'Europe/Athens',
      locale: 'el-GR',
      isActive: true,
    },
    create: {
      name: 'Demo Client',
      slug: 'demo-client',
      companyName: 'Demo Client SA',
      timezone: 'Europe/Athens',
      locale: 'el-GR',
      isActive: true,
    },
  });

  await prisma.workspaceSettings.upsert({
    where: {
      workspaceId: workspace.id,
    },
    update: {
      defaultRecordLabelSingular: 'Υπόθεση',
      defaultRecordLabelPlural: 'Υποθέσεις',
      dateFormat: 'DD/MM/YYYY',
      currencyCode: 'EUR',
      numberFormat: 'el-GR',
      featuresJsonb: {
        notes: true,
        files: true,
        tasks: true,
        activityTimeline: true,
        reports: true,
        notifications: true,
      },
    },
    create: {
      workspaceId: workspace.id,
      defaultRecordLabelSingular: 'Υπόθεση',
      defaultRecordLabelPlural: 'Υποθέσεις',
      dateFormat: 'DD/MM/YYYY',
      currencyCode: 'EUR',
      numberFormat: 'el-GR',
      featuresJsonb: {
        notes: true,
        files: true,
        tasks: true,
        activityTimeline: true,
        reports: true,
        notifications: true,
      },
    },
  });

  await upsertRoles(workspace.id);

  const admin = await upsertDemoUser({
    workspaceId: workspace.id,
    email: 'admin@client.com',
    firstName: 'Demo',
    lastName: 'Admin',
    jobTitle: 'Client Admin',
    roleCode: 'client_admin',
    isOwner: true,
  });

  const manager = await upsertDemoUser({
    workspaceId: workspace.id,
    email: 'manager@client.com',
    firstName: 'Demo',
    lastName: 'Manager',
    jobTitle: 'Manager',
    roleCode: 'manager',
  });

  const operator = await upsertDemoUser({
    workspaceId: workspace.id,
    email: 'operator@client.com',
    firstName: 'Demo',
    lastName: 'Operator',
    jobTitle: 'Operator',
    roleCode: 'operator',
  });

  await upsertDemoUser({
    workspaceId: workspace.id,
    email: 'viewer@client.com',
    firstName: 'Demo',
    lastName: 'Viewer',
    jobTitle: 'Viewer',
    roleCode: 'viewer',
  });

  const recordType = await prisma.recordType.upsert({
    where: {
      workspaceId_key: {
        workspaceId: workspace.id,
        key: 'order',
      },
    },
    update: {
      singularLabel: 'Order',
      pluralLabel: 'Orders',
      isActive: true,
    },
    create: {
      workspaceId: workspace.id,
      key: 'order',
      singularLabel: 'Order',
      pluralLabel: 'Orders',
      isActive: true,
    },
  });

  const recordStatuses = [
    {
      key: 'new',
      label: 'New',
      color: 'slate',
      sortOrder: 1,
      isDefault: true,
      isTerminal: false,
    },
    {
      key: 'in_review',
      label: 'In Review',
      color: 'amber',
      sortOrder: 2,
      isDefault: false,
      isTerminal: false,
    },
    {
      key: 'in_progress',
      label: 'In Progress',
      color: 'blue',
      sortOrder: 3,
      isDefault: false,
      isTerminal: false,
    },
    {
      key: 'completed',
      label: 'Completed',
      color: 'green',
      sortOrder: 4,
      isDefault: false,
      isTerminal: true,
    },
  ];

  const statusByKey = new Map<string, { id: string }>();

  for (const status of recordStatuses) {
    const savedStatus = await prisma.statusDefinition.upsert({
      where: {
        workspaceId_entityType_recordTypeId_key: {
          workspaceId: workspace.id,
          entityType: 'record',
          recordTypeId: recordType.id,
          key: status.key,
        },
      },
      update: {
        label: status.label,
        color: status.color,
        sortOrder: status.sortOrder,
        isDefault: status.isDefault,
        isTerminal: status.isTerminal,
      },
      create: {
        workspaceId: workspace.id,
        entityType: 'record',
        recordTypeId: recordType.id,
        key: status.key,
        label: status.label,
        color: status.color,
        sortOrder: status.sortOrder,
        isDefault: status.isDefault,
        isTerminal: status.isTerminal,
      },
      select: {
        id: true,
      },
    });

    statusByKey.set(status.key, savedStatus);
  }

  const account = await upsertAccountByCode({
    id: IDS.accountAcme,
    workspaceId: workspace.id,
    ownerUserId: admin.user.id,
    code: 'ACME',
    name: 'Acme SA',
  });

  const contact = await upsertContactByEmail({
    id: IDS.contactMaria,
    workspaceId: workspace.id,
    accountId: account.id,
    email: 'maria@acme.test',
  });

  const recordOne = await upsertRecordByCode({
    id: IDS.recordOne,
    workspaceId: workspace.id,
    recordTypeId: recordType.id,
    accountId: account.id,
    contactId: contact.id,
    code: 'ORD-1001',
    title: 'ORD-1001',
    description: 'Demo seeded order - new request',
    statusId: statusByKey.get('new')!.id,
    priority: 'medium',
    ownerUserId: admin.user.id,
    assigneeUserId: admin.user.id,
    dataJson: {
      channel: 'eshop',
      amount: 1250,
    },
  });

  const recordTwo = await upsertRecordByCode({
    id: IDS.recordTwo,
    workspaceId: workspace.id,
    recordTypeId: recordType.id,
    accountId: account.id,
    contactId: contact.id,
    code: 'ORD-1002',
    title: 'ORD-1002',
    description: 'Demo seeded order - in progress',
    statusId: statusByKey.get('in_progress')!.id,
    priority: 'high',
    ownerUserId: admin.user.id,
    assigneeUserId: manager.user.id,
    dataJson: {
      channel: 'api',
      amount: 3200,
    },
  });

  const recordThree = await upsertRecordByCode({
    id: IDS.recordThree,
    workspaceId: workspace.id,
    recordTypeId: recordType.id,
    accountId: account.id,
    contactId: contact.id,
    code: 'ORD-1003',
    title: 'ORD-1003',
    description: 'Demo seeded order - completed',
    statusId: statusByKey.get('completed')!.id,
    priority: 'low',
    ownerUserId: admin.user.id,
    assigneeUserId: operator.user.id,
    dataJson: {
      channel: 'manual',
      amount: 680,
    },
  });

  await upsertTask({
    id: IDS.taskOne,
    workspaceId: workspace.id,
    title: 'Call customer',
    description: 'Follow up on seeded order',
    status: 'open',
    priority: 'medium',
    assigneeUserId: admin.user.id,
    createdByUserId: admin.user.id,
    relatedEntityId: recordOne.id,
    dueAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
  });

  await upsertTask({
    id: IDS.taskTwo,
    workspaceId: workspace.id,
    title: 'Review integration payload',
    description: 'Validate API payload for order ORD-1002',
    status: 'in_progress',
    priority: 'high',
    assigneeUserId: manager.user.id,
    createdByUserId: admin.user.id,
    relatedEntityId: recordTwo.id,
    dueAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
  });

  await upsertTask({
    id: IDS.taskThree,
    workspaceId: workspace.id,
    title: 'Archive completed order',
    description: 'Final archive task for ORD-1003',
    status: 'completed',
    priority: 'low',
    assigneeUserId: operator.user.id,
    createdByUserId: manager.user.id,
    relatedEntityId: recordThree.id,
  });

  await prisma.note
    .create({
      data: {
        workspaceId: workspace.id,
        recordId: recordOne.id,
        entityType: 'record',
        entityId: recordOne.id,
        authorUserId: admin.user.id,
        body: 'Seeded demo note for ORD-1001.',
        isInternal: true,
      },
    })
    .catch(() => undefined);

  await prisma.activityEvent
    .create({
      data: {
        workspaceId: workspace.id,
        entityType: 'record',
        entityId: recordOne.id,
        actorUserId: admin.user.id,
        eventType: 'seed.created',
        eventLabel: 'Seed demo data created',
        oldValuesJsonb: Prisma.JsonNull,
        newValuesJsonb: {
          recordCode: recordOne.code,
        },
        metaJsonb: {
          source: 'prisma.seed',
        },
      },
    })
    .catch(() => undefined);

  await upsertSavedReport({
    id: IDS.reportOverview,
    workspaceId: workspace.id,
    name: 'Records Overview',
    entityType: 'record',
    reportType: 'overview',
    definitionJsonb: {
      group_by: 'status',
    },
    createdByUserId: admin.user.id,
  });

  await upsertSavedReport({
    id: IDS.reportPriority,
    workspaceId: workspace.id,
    name: 'Records by Priority',
    entityType: 'record',
    reportType: 'summary',
    definitionJsonb: {
      group_by: 'priority',
    },
    createdByUserId: admin.user.id,
  });

  await upsertSavedReport({
    id: IDS.reportRecentTable,
    workspaceId: workspace.id,
    name: 'Recent Records Table',
    entityType: 'record',
    reportType: 'table',
    definitionJsonb: {
      mode: 'table',
      limit: 20,
    },
    createdByUserId: admin.user.id,
  });

  await upsertSavedView({
    id: IDS.savedViewOpen,
    workspaceId: workspace.id,
    entityType: 'record',
    name: 'Ανοιχτές Υποθέσεις',
    isDefault: true,
    visibility: 'private',
    createdByUserId: admin.user.id,
    filtersJsonb: {
      status: ['new', 'in_progress'],
    },
    columnsJsonb: ['code', 'title', 'status', 'priority', 'assignee_user', 'updated_at'],
    sortingJsonb: {
      field: 'updated_at',
      direction: 'desc',
    },
  });

  await upsertSavedView({
    id: IDS.savedViewAssigned,
    workspaceId: workspace.id,
    entityType: 'record',
    name: 'Ανατεθειμένες σε εμένα',
    isDefault: false,
    visibility: 'private',
    createdByUserId: admin.user.id,
    filtersJsonb: {
      assignee_user_id: admin.user.id,
    },
    columnsJsonb: ['code', 'title', 'status', 'priority', 'due_at'],
    sortingJsonb: {
      field: 'due_at',
      direction: 'asc',
    },
  });

  const dashboard = await upsertDashboard({
    id: IDS.dashboardMain,
    workspaceId: workspace.id,
    name: 'Main Dashboard',
    scopeType: 'workspace',
    scopeId: null,
    isDefault: true,
  });

  await upsertDashboardWidget({
    id: IDS.widgetStatus,
    workspaceId: workspace.id,
    dashboardConfigId: dashboard.id,
    widgetType: 'records_by_status',
    title: 'Records by Status',
    positionX: 0,
    positionY: 0,
    width: 6,
    height: 3,
    settingsJsonb: {},
  });

  await upsertDashboardWidget({
    id: IDS.widgetPriority,
    workspaceId: workspace.id,
    dashboardConfigId: dashboard.id,
    widgetType: 'records_by_priority',
    title: 'Records by Priority',
    positionX: 6,
    positionY: 0,
    width: 6,
    height: 3,
    settingsJsonb: {},
  });

  await upsertDashboardWidget({
    id: IDS.widgetTasks,
    workspaceId: workspace.id,
    dashboardConfigId: dashboard.id,
    widgetType: 'tasks_by_status',
    title: 'Tasks by Status',
    positionX: 0,
    positionY: 3,
    width: 6,
    height: 3,
    settingsJsonb: {},
  });

  await upsertDashboardWidget({
    id: IDS.widgetActivity,
    workspaceId: workspace.id,
    dashboardConfigId: dashboard.id,
    widgetType: 'recent_activity',
    title: 'Recent Activity',
    positionX: 6,
    positionY: 3,
    width: 6,
    height: 4,
    settingsJsonb: {},
  });

  await upsertDashboardWidget({
    id: IDS.widgetNotifications,
    workspaceId: workspace.id,
    dashboardConfigId: dashboard.id,
    widgetType: 'unread_notifications',
    title: 'Unread Notifications',
    positionX: 0,
    positionY: 6,
    width: 6,
    height: 3,
    settingsJsonb: {},
  });

  await prisma.notification
    .create({
      data: {
        workspaceId: workspace.id,
        userId: admin.user.id,
        type: 'record_assigned',
        title: 'New record assigned',
        body: 'ORD-1001 has been assigned to you.',
        entityType: 'record',
        entityId: recordOne.id,
        isRead: false,
      },
    })
    .catch(() => undefined);

  console.log('');
  console.log('Seed completed ✅');
  console.log('');
  console.log('Demo users:');
  console.log(`- admin@client.com / ${DEFAULT_PASSWORD}`);
  console.log(`- manager@client.com / ${DEFAULT_PASSWORD}`);
  console.log(`- operator@client.com / ${DEFAULT_PASSWORD}`);
  console.log(`- viewer@client.com / ${DEFAULT_PASSWORD}`);
  console.log('');
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });