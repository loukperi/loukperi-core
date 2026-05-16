import { Module } from '@nestjs/common';
import { DatabaseModule } from 'src/database/database.module';
import { ActivityModule } from '../activity/activity.module';
import { FilesController } from './files.controller';
import { FilesService } from './files.service';

@Module({
  imports: [DatabaseModule, ActivityModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}