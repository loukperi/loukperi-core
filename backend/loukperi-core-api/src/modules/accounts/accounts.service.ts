import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CurrentUserPayload } from 'src/common/decorators/current-user.decorator';
import { AccountRepository } from 'src/database/repositories/account.repository';
import { CreateAccountDto } from './dto/create-account.dto';
import { ListAccountsQueryDto } from './dto/list-accounts.query.dto';
import { UpdateAccountDto } from './dto/update-account.dto';

@Injectable()
export class AccountsService {
  constructor(private readonly accountRepository: AccountRepository) {}

  async list(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, query: ListAccountsQueryDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const result = await this.accountRepository.listByWorkspace(resolvedWorkspaceId, query);
    return {
      items: result.items.map((item) => this.toAccountResponse(item)),
      pagination: {
        page: query.page,
        page_size: query.page_size,
        total: result.total,
        total_pages: Math.ceil(result.total / query.page_size),
      },
    };
  }

  async create(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, dto: CreateAccountDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const created = await this.accountRepository.create({
      workspaceId: resolvedWorkspaceId,
      name: dto.name,
      code: dto.code,
      accountType: dto.account_type,
      vatNumber: dto.vat_number,
      email: dto.email?.toLowerCase(),
      phone: dto.phone,
      website: dto.website,
      addressLine1: dto.address_line_1,
      addressLine2: dto.address_line_2,
      city: dto.city,
      postalCode: dto.postal_code,
      country: dto.country,
      status: dto.status ?? 'active',
      ownerUserId: dto.owner_user_id,
      sourceSystem: dto.source_system,
      sourceExternalId: dto.source_external_id,
      metadataJsonb: (dto.metadata_jsonb ?? {}) as Prisma.InputJsonValue,
    });

    return this.toAccountResponse(created);
  }

  async getOne(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, accountId: string) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const account = await this.accountRepository.findOne(resolvedWorkspaceId, accountId);
    if (!account) throw new NotFoundException('Account not found');
    return this.toAccountResponse(account);
  }

  async update(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, accountId: string, dto: UpdateAccountDto) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const existing = await this.accountRepository.findOne(resolvedWorkspaceId, accountId);
    if (!existing) throw new NotFoundException('Account not found');

    const updated = await this.accountRepository.update(accountId, {
      name: dto.name,
      code: dto.code,
      accountType: dto.account_type,
      vatNumber: dto.vat_number,
      email: dto.email?.toLowerCase(),
      phone: dto.phone,
      website: dto.website,
      addressLine1: dto.address_line_1,
      addressLine2: dto.address_line_2,
      city: dto.city,
      postalCode: dto.postal_code,
      country: dto.country,
      status: dto.status,
      ownerUserId: dto.owner_user_id,
      sourceSystem: dto.source_system,
      sourceExternalId: dto.source_external_id,
      metadataJsonb: dto.metadata_jsonb as Prisma.InputJsonValue | undefined,
    });

    return this.toAccountResponse(updated);
  }

  async listRecords(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, accountId: string, page: number, pageSize: number) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const account = await this.accountRepository.findOne(resolvedWorkspaceId, accountId);
    if (!account) throw new NotFoundException('Account not found');

    const result = await this.accountRepository.listRecords(resolvedWorkspaceId, accountId, page, pageSize);
    return {
      items: result.items.map((item) => ({
        id: item.id,
        title: item.title,
        code: item.code,
        status: item.status ? { id: item.status.id, key: item.status.key, label: item.status.label, color: item.status.color } : null,
        record_type: item.recordType ? { id: item.recordType.id, key: item.recordType.key, singular_label: item.recordType.singularLabel, plural_label: item.recordType.pluralLabel } : null,
        assignee_user: item.assigneeUser ? { id: item.assigneeUser.id, full_name: `${item.assigneeUser.firstName} ${item.assigneeUser.lastName}` } : null,
        due_at: item.dueAt?.toISOString() ?? null,
        created_at: item.createdAt.toISOString(),
      })),
      pagination: { page, page_size: pageSize, total: result.total, total_pages: Math.ceil(result.total / pageSize) },
    };
  }

  async listContacts(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined, accountId: string, page: number, pageSize: number) {
    const resolvedWorkspaceId = this.resolveWorkspaceId(workspaceId, currentUser);
    const account = await this.accountRepository.findOne(resolvedWorkspaceId, accountId);
    if (!account) throw new NotFoundException('Account not found');

    const result = await this.accountRepository.listContacts(resolvedWorkspaceId, accountId, page, pageSize);
    return {
      items: result.items.map((item) => ({
        id: item.id,
        account_id: item.accountId,
        full_name: `${item.firstName} ${item.lastName}`,
        first_name: item.firstName,
        last_name: item.lastName,
        email: item.email,
        phone: item.phone,
        job_title: item.jobTitle,
        is_primary: item.isPrimary,
        status: item.status,
        created_at: item.createdAt.toISOString(),
      })),
      pagination: { page, page_size: pageSize, total: result.total, total_pages: Math.ceil(result.total / pageSize) },
    };
  }

  private resolveWorkspaceId(workspaceId: string | undefined, currentUser: CurrentUserPayload | undefined) {
    const resolvedWorkspaceId = workspaceId ?? currentUser?.defaultWorkspaceId;
    if (!resolvedWorkspaceId) throw new ForbiddenException('Workspace context is required');
    if (!currentUser || !currentUser.workspaceIds.includes(resolvedWorkspaceId)) throw new ForbiddenException('No access to workspace');
    return resolvedWorkspaceId;
  }

  private toAccountResponse(account: any) {
    return {
      id: account.id,
      name: account.name,
      code: account.code,
      account_type: account.accountType,
      vat_number: account.vatNumber,
      email: account.email,
      phone: account.phone,
      website: account.website,
      address_line_1: account.addressLine1,
      address_line_2: account.addressLine2,
      city: account.city,
      postal_code: account.postalCode,
      country: account.country,
      status: account.status,
      owner_user: account.ownerUser ? { id: account.ownerUser.id, full_name: `${account.ownerUser.firstName} ${account.ownerUser.lastName}`, email: account.ownerUser.email } : null,
      source_system: account.sourceSystem,
      source_external_id: account.sourceExternalId,
      metadata_jsonb: account.metadataJsonb ?? {},
      contacts_count: account.contacts?.length ?? 0,
      records_count: account.records?.length ?? 0,
      created_at: account.createdAt.toISOString(),
      updated_at: account.updatedAt.toISOString(),
    };
  }
}
