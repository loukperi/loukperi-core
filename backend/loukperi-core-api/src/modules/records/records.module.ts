import { Module } from '@nestjs/common';
import { ActivityModule } from '../activity/activity.module';
import { RecordsController } from './records.controller';
import { RecordsService } from './records.service';

@Module({
  imports: [ActivityModule],
  controllers: [RecordsController],
  providers: [RecordsService],
})
export class RecordsModule {}