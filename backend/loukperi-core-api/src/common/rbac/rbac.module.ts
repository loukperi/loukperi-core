import { Global, Module } from '@nestjs/common';
import { PermissionsGuard } from '../guards/permissions.guard';
import { CapabilitiesController } from './capabilities.controller';
import { RbacService } from './rbac.service';

@Global()
@Module({
  controllers: [CapabilitiesController],
  providers: [RbacService, PermissionsGuard],
  exports: [RbacService, PermissionsGuard],
})
export class RbacModule {}
