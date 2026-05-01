import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { StatusesController } from './statuses.controller';
import { StatusesService } from './statuses.service';

@Module({
  imports: [DatabaseModule],
  controllers: [StatusesController],
  providers: [StatusesService],
})
export class StatusesModule {}