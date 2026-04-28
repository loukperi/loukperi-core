import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

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

async function upsertPermissions() {
  for (const [code, name, description, module] of permissionCatalog) {
    await prisma.permission.upsert({
      where: { code },
      update: { name, description, module },
      create: { code, name, description, module },
    });
  }
}

async function main(): Promise<void> {
  await upsertPermissions();

  const workspace = await prisma.workspace.upsert({
    where: { slug: 'demo-client' },
    update: { name: 'Demo Client', isActive: true },
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
    where: { workspaceId: workspace.id },
    update: {},
    create: {
      workspaceId: workspace.id,
      defaultRecordLabelSingular: 'Order',
      defaultRecordLabelPlural: 'Orders',
      featuresJsonb: {},
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@client.com' },
    update: {},
    create: {
      email: 'admin@client.com',
      passwordHash: await argon2.hash('ChangeMe123!'),
      firstName: 'Demo',
      lastName: 'Admin',
      isActive: true,
    },
  });

  const workspaceUser = await prisma.workspaceUser.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: admin.id },
    },
    update: { status: 'active', isOwner: true, jobTitle: 'Client Admin' },
    create: {
      workspaceId: workspace.id,
      userId: admin.id,
      status: 'active',
      isOwner: true,
      jobTitle: 'Client Admin',
    },
  });

  const roleDefinitions = [
    { code: 'client_admin', name: 'Client Admin', permissions: permissionCatalog.map(([code]) => code) },
    {
      code: 'manager', name: 'Manager', permissions: [
        'workspace.read','accounts.read','accounts.create','accounts.update','contacts.read','contacts.create','contacts.update',
        'records.read','records.create','records.update','records.assign','records.change_status','records.export',
        'tasks.read','tasks.create','tasks.update','tasks.complete','reports.read','reports.create','reports.export','notifications.read',
      ],
    },
    {
      code: 'operator', name: 'Operator', permissions: [
        'workspace.read','accounts.read','contacts.read','records.read','records.create','records.update','tasks.read','tasks.create','tasks.update','tasks.complete','notifications.read',
      ],
    },
    {
      code: 'viewer', name: 'Viewer', permissions: [
        'workspace.read','accounts.read','contacts.read','records.read','tasks.read','reports.read','notifications.read',
      ],
    },
  ];

  for (const roleDefinition of roleDefinitions) {
    const role = await prisma.role.upsert({
      where: { workspaceId_code: { workspaceId: workspace.id, code: roleDefinition.code } },
      update: { name: roleDefinition.name },
      create: { workspaceId: workspace.id, code: roleDefinition.code, name: roleDefinition.name, isSystemRole: true },
    });

    const permissionIds = await prisma.permission.findMany({ where: { code: { in: roleDefinition.permissions } }, select: { id: true } });

    await prisma.rolePermission.deleteMany({ where: { workspaceId: workspace.id, roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissionIds.map((permission) => ({ workspaceId: workspace.id, roleId: role.id, permissionId: permission.id })),
      skipDuplicates: true,
    });

    if (roleDefinition.code === 'client_admin') {
      await prisma.workspaceUserRole.upsert({
        where: {
          workspaceId_workspaceUserId_roleId: {
            workspaceId: workspace.id,
            workspaceUserId: workspaceUser.id,
            roleId: role.id,
          },
        },
        update: {},
        create: { workspaceId: workspace.id, workspaceUserId: workspaceUser.id, roleId: role.id },
      });
    }
  }

  const recordType = await prisma.recordType.upsert({
    where: { workspaceId_key: { workspaceId: workspace.id, key: 'order' } },
    update: {},
    create: { workspaceId: workspace.id, key: 'order', singularLabel: 'Order', pluralLabel: 'Orders', isActive: true },
  });

  const recordStatuses = [
    { key: 'new', label: 'New', color: 'slate', sortOrder: 1, isDefault: true, isTerminal: false },
    { key: 'in_review', label: 'In Review', color: 'amber', sortOrder: 2, isDefault: false, isTerminal: false },
    { key: 'in_progress', label: 'In Progress', color: 'blue', sortOrder: 3, isDefault: false, isTerminal: false },
    { key: 'completed', label: 'Completed', color: 'green', sortOrder: 4, isDefault: false, isTerminal: true },
  ];

  for (const status of recordStatuses) {
    await prisma.statusDefinition.upsert({
      where: {
        workspaceId_entityType_recordTypeId_key: {
          workspaceId: workspace.id,
          entityType: 'record',
          recordTypeId: recordType.id,
          key: status.key,
        },
      },
      update: { label: status.label, color: status.color, sortOrder: status.sortOrder, isDefault: status.isDefault, isTerminal: status.isTerminal },
      create: { workspaceId: workspace.id, entityType: 'record', recordTypeId: recordType.id, key: status.key, label: status.label, color: status.color, sortOrder: status.sortOrder, isDefault: status.isDefault, isTerminal: status.isTerminal },
    });
  }

  const defaultStatus = await prisma.statusDefinition.findFirstOrThrow({
    where: { workspaceId: workspace.id, entityType: 'record', recordTypeId: recordType.id, isDefault: true },
  });

  const account = await prisma.account.upsert({
    where: { id: '00000000-0000-0000-0000-00000000ac01' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-00000000ac01',
      workspaceId: workspace.id,
      name: 'Acme SA',
      code: 'ACME',
      accountType: 'customer',
      email: 'info@acme.test',
      phone: '+30 2100000000',
      city: 'Athens',
      country: 'GR',
      status: 'active',
      ownerUserId: admin.id,
      metadataJsonb: { tier: 'gold' },
    },
  }).catch(async () => prisma.account.findFirstOrThrow({ where: { workspaceId: workspace.id, code: 'ACME' } }));

  const contact = await prisma.contact.create({
    data: {
      workspaceId: workspace.id,
      accountId: account.id,
      firstName: 'Maria',
      lastName: 'Papadopoulou',
      email: 'maria@acme.test',
      phone: '+30 6990000000',
      jobTitle: 'Operations Manager',
      isPrimary: true,
      status: 'active',
      metadataJsonb: {},
    },
  }).catch(async () => prisma.contact.findFirstOrThrow({ where: { workspaceId: workspace.id, accountId: account.id, email: 'maria@acme.test' } }));

  const record = await prisma.record.create({
    data: {
      workspaceId: workspace.id,
      recordTypeId: recordType.id,
      accountId: account.id,
      contactId: contact.id,
      title: 'ORD-1001',
      code: 'ORD-1001',
      description: 'Demo seeded order',
      statusId: defaultStatus.id,
      priority: 'medium',
      ownerUserId: admin.id,
      assigneeUserId: admin.id,
      dataJson: { channel: 'eshop' },
    },
  }).catch(async () => prisma.record.findFirstOrThrow({ where: { workspaceId: workspace.id, code: 'ORD-1001' } }));

  await prisma.task.create({
    data: {
      workspaceId: workspace.id,
      title: 'Call customer',
      description: 'Follow up on seeded order',
      status: 'open',
      priority: 'medium',
      assigneeUserId: admin.id,
      createdByUserId: admin.id,
      relatedEntityType: 'record',
      relatedEntityId: record.id,
    },
  }).catch(() => undefined);

  await prisma.savedReport.create({
    data: {
      workspaceId: workspace.id,
      name: 'Records Overview',
      entityType: 'record',
      reportType: 'overview',
      definitionJsonb: { group_by: 'status' },
      isSystem: true,
      createdByUserId: admin.id,
    },
  }).catch(() => undefined);

  await prisma.notification.create({
    data: {
      workspaceId: workspace.id,
      userId: admin.id,
      type: 'record_assigned',
      title: 'New record assigned',
      body: 'ORD-1001 has been assigned to you.',
      entityType: 'record',
      entityId: record.id,
      isRead: false,
    },
  }).catch(() => undefined);

  console.log('Seed completed');
}

main()
  .catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
