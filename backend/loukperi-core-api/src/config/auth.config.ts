import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  accessSecret: process.env.JWT_ACCESS_SECRET ?? 'change-me-access',
  refreshSecret: process.env.JWT_REFRESH_SECRET ?? 'change-me-refresh',
  accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
  refreshTtl: process.env.JWT_REFRESH_TTL ?? '30d',
}));
