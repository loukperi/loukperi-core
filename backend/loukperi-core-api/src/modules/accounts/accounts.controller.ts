import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { ListAccountsQueryDto } from './dto/list-accounts.query.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@ApiTags('Accounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  @Permissions('accounts.read')
  list(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Query() query: ListAccountsQueryDto,
  ) {
    return this.accountsService.list(workspaceId, currentUser, query);
  }

  @Post()
  @Permissions('accounts.create')
  create(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Body() dto: CreateAccountDto,
  ) {
    return this.accountsService.create(workspaceId, currentUser, dto);
  }

  @Get(':accountId')
  @Permissions('accounts.read')
  getOne(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('accountId') accountId: string,
  ) {
    return this.accountsService.getOne(workspaceId, currentUser, accountId);
  }

  @Patch(':accountId')
  @Permissions('accounts.update')
  update(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('accountId') accountId: string,
    @Body() dto: UpdateAccountDto,
  ) {
    return this.accountsService.update(workspaceId, currentUser, accountId, dto);
  }

  @Get(':accountId/records')
  @Permissions('accounts.read', 'records.read')
  listRecords(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('accountId') accountId: string,
    @Query('page') page?: number,
    @Query('page_size') pageSize?: number,
  ) {
    return this.accountsService.listRecords(workspaceId, currentUser, accountId, Number(page ?? 1), Number(pageSize ?? 25));
  }

  @Get(':accountId/contacts')
  @Permissions('accounts.read', 'contacts.read')
  listContacts(
    @WorkspaceId() workspaceId: string | undefined,
    @CurrentUser() currentUser: CurrentUserPayload | undefined,
    @Param('accountId') accountId: string,
    @Query('page') page?: number,
    @Query('page_size') pageSize?: number,
  ) {
    return this.accountsService.listContacts(workspaceId, currentUser, accountId, Number(page ?? 1), Number(pageSize ?? 25));
  }
}
