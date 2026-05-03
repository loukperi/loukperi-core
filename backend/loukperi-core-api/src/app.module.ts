import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import dbConfig from './config/db.config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspacesModule } from './modules/workspaces/workspaces.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { RecordsModule } from './modules/records/records.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { AccountsModule } from './modules/accounts/accounts.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { StatusesModule } from './modules/statuses/statuses.module';
import { ActivityModule } from './modules/activity/activity.module';
import { NotesModule } from './modules/notes/notes.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, dbConfig],
    }),
    DatabaseModule,
    AuthModule,
    WorkspacesModule,
    UsersModule,
    RolesModule,
    RecordsModule,
    TasksModule,
    AccountsModule,
    ContactsModule,
    ReportsModule,
    NotificationsModule,
	StatusesModule,
	ActivityModule,
	NotesModule,
  ],
})
export class AppModule {}
