import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { HealthService } from './health.service';

@ApiTags('Health')
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getAppHealth() {
    return this.healthService.getAppHealth();
  }

  @Get('db')
  getDatabaseHealth() {
    return this.healthService.getDatabaseHealth();
  }
}