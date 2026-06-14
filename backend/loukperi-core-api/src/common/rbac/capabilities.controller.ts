import { Controller, Get, Headers, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import {
  CurrentUser,
  CurrentUserPayload,
} from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RbacService } from './rbac.service';

@ApiTags('Capabilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('capabilities')
export class CapabilitiesController {
  constructor(private readonly rbacService: RbacService) {}

  @Get('me')
  getMyCapabilities(
    @Headers('x-workspace-id') workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
  ) {
    return this.rbacService.getCapabilities(workspaceId, currentUser);
  }
}
