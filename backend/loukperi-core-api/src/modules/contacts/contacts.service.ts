import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { ContactRepository } from 'src/database/repositories/contact.repository';
import { CreateContactDto } from './dto/create-contact.dto';
import { ListContactsQueryDto } from './dto/list-contacts.query.dto';
import { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async list(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, query: ListContactsQueryDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const result = await this.contactRepository.listByWorkspace(resolvedWorkspaceId, query);
    return {
      items: result.items.map((item) => this.toContactResponse(item)),
      pagination: { page: query.page, page_size: query.page_size, total: result.total, total_pages: Math.ceil(result.total / query.page_size) },
    };
  }

  async create(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, dto: CreateContactDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const created = await this.contactRepository.create({
      workspaceId: resolvedWorkspaceId,
      accountId: dto.account_id,
      firstName: dto.first_name,
      lastName: dto.last_name,
      email: dto.email?.toLowerCase(),
      phone: dto.phone,
      jobTitle: dto.job_title,
      isPrimary: dto.is_primary ?? false,
      status: dto.status ?? 'active',
      sourceSystem: dto.source_system,
      sourceExternalId: dto.source_external_id,
      metadataJsonb: (dto.metadata_jsonb ?? {}) as Prisma.InputJsonValue,
    });
    return this.toContactResponse(created);
  }

  async getOne(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, contactId: string) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const contact = await this.contactRepository.findOne(resolvedWorkspaceId, contactId);
    if (!contact) throw new NotFoundException('Contact not found');
    return this.toContactResponse(contact);
  }

  async update(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, contactId: string, dto: UpdateContactDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const existing = await this.contactRepository.findOne(resolvedWorkspaceId, contactId);
    if (!existing) throw new NotFoundException('Contact not found');

    const updated = await this.contactRepository.update(contactId, {
      accountId: dto.account_id,
      firstName: dto.first_name,
      lastName: dto.last_name,
      email: dto.email?.toLowerCase(),
      phone: dto.phone,
      jobTitle: dto.job_title,
      isPrimary: dto.is_primary,
      status: dto.status,
      sourceSystem: dto.source_system,
      sourceExternalId: dto.source_external_id,
      metadataJsonb: dto.metadata_jsonb as Prisma.InputJsonValue | undefined,
    });
    return this.toContactResponse(updated);
  }

  private resolveWorkspaceId(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined) {
    const resolvedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;
    if (!resolvedWorkspaceId) throw new ForbiddenException('Workspace context is required');
    if (!currentUser || !currentUser.workspaceIds.includes(resolvedWorkspaceId)) throw new ForbiddenException('No access to workspace');
    return resolvedWorkspaceId;
  }

  private toContactResponse(contact: any) {
    return {
      id: contact.id,
      account_id: contact.accountId,
      account: contact.account ? { id: contact.account.id, name: contact.account.name } : null,
      first_name: contact.firstName,
      last_name: contact.lastName,
      full_name: `${contact.firstName} ${contact.lastName}`,
      email: contact.email,
      phone: contact.phone,
      job_title: contact.jobTitle,
      is_primary: contact.isPrimary,
      status: contact.status,
      source_system: contact.sourceSystem,
      source_external_id: contact.sourceExternalId,
      metadata_jsonb: contact.metadataJsonb ?? {},
      created_at: contact.createdAt.toISOString(),
      updated_at: contact.updatedAt.toISOString(),
    };
  }
}
