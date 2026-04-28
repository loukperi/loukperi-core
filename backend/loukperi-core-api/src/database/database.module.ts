import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { AuthRepository } from './repositories/auth.repository';
import { WorkspaceRepository } from './repositories/workspace.repository';
import { UserRepository } from './repositories/user.repository';
import { RecordRepository } from './repositories/record.repository';
import { TaskRepository } from './repositories/task.repository';
import { AccountRepository } from './repositories/account.repository';
import { ContactRepository } from './repositories/contact.repository';
import { ReportRepository } from './repositories/report.repository';
import { NotificationRepository } from './repositories/notification.repository';

@Global()
@Module({
  providers: [
    PrismaService,
    AuthRepository,
    WorkspaceRepository,
    UserRepository,
    RecordRepository,
    TaskRepository,
    AccountRepository,
    ContactRepository,
    ReportRepository,
    NotificationRepository,
  ],
  exports: [
    PrismaService,
    AuthRepository,
    WorkspaceRepository,
    UserRepository,
    RecordRepository,
    TaskRepository,
    AccountRepository,
    ContactRepository,
    ReportRepository,
    NotificationRepository,
  ],
})
export class DatabaseModule {}
