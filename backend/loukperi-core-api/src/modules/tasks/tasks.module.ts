import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskCollaborationController } from './task-collaboration.controller';
import { TaskCollaborationService } from './task-collaboration.service';

@Module({
  imports: [ActivityModule],
  controllers: [TasksController, TaskCollaborationController],
  providers: [TasksService, TaskCollaborationService],
})
export class TasksModule {}