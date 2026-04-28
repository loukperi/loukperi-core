import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { Permissions } from 'src/common/decorators/permissions.decorator';
import { WorkspaceId } from 'src/common/decorators/workspace-id.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/common/guards/permissions.guard';
import { ResponseEnvelopeInterceptor } from 'src/common/interceptors/response-envelope.interceptor';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsQueryDto } from './dto/list-contacts.query.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@ApiTags('Contacts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ResponseEnvelopeInterceptor)
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Get()
  @Permissions('contacts.read')
  list(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Query() query: ListContactsQueryDto) {
    return this.contactsService.list(workspaceId, currentUser, query);
  }

  @Post()
  @Permissions('contacts.create')
  create(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Body() dto: CreateContactDto) {
    return this.contactsService.create(workspaceId, currentUser, dto);
  }

  @Get(':contactId')
  @Permissions('contacts.read')
  getOne(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Param('contactId') contactId: string) {
    return this.contactsService.getOne(workspaceId, currentUser, contactId);
  }

  @Patch(':contactId')
  @Permissions('contacts.update')
  update(@WorkspaceId() workspaceId: string | undefined, @CurrentUser() currentUser: CurrentUserPayload | undefined, @Param('contactId') contactId: string, @Body() dto: UpdateContactDto) {
    return this.contactsService.update(workspaceId, currentUser, contactId, dto);
  }
}
