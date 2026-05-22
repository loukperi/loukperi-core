import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from 'src/database/prisma.service';

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  getAppHealth() {
    return {
      status: 'ok',
      service: 'loukperi-core-api',
      environment: process.env.NODE_ENV ?? 'development',
      uptime_seconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  async getDatabaseHealth() {
    const startedAt = Date.now();

    try {
      await this.prisma.$queryRaw`SELECT 1`;

      return {
        status: 'ok',
        database: 'ok',
        response_time_ms: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      throw new ServiceUnavailableException({
        status: 'error',
        database: 'down',
        response_time_ms: Date.now() - startedAt,
        timestamp: new Date().toISOString(),
        message:
          error instanceof Error ? error.message : 'Database health check failed',
      });
    }
  }
}