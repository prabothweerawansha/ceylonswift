import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { AuthAuditService } from '../../auth/services/audit.service';
import type { AuthenticatedRequest } from '../../auth/types/authenticated-request';
import { PermissionGuard } from './permission.guard';

describe('PermissionGuard', () => {
  const required = jest.fn(); const auditRecord = jest.fn().mockResolvedValue(undefined);
  const guard = new PermissionGuard({ getAllAndOverride: required } as unknown as Reflector, { record: auditRecord } as unknown as AuthAuditService);
  const context = (request: Partial<AuthenticatedRequest>) => ({ getHandler: jest.fn(), getClass: jest.fn(), switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;
  beforeEach(() => { required.mockReset(); auditRecord.mockClear(); });
  it('grants all required permissions', async () => {
    required.mockReturnValue(['role.read', 'permission.read']);
    const request = { requestId: 'r', principal: { userId: 'u', sessionId: 's' }, authorization: { permissions: new Set(['role.read', 'permission.read']) } } as Partial<AuthenticatedRequest>;
    await expect(guard.canActivate(context(request))).resolves.toBe(true);
  });
  it('denies a missing permission and audits it', async () => {
    required.mockReturnValue(['role.assign']);
    const request = { requestId: 'r', principal: { userId: 'u', sessionId: 's' }, authorization: { permissions: new Set<string>() } } as Partial<AuthenticatedRequest>;
    await expect(guard.canActivate(context(request))).rejects.toBeInstanceOf(ForbiddenException);
    expect(auditRecord).toHaveBeenCalledWith('PERMISSION_DENIED', 'DENIED', 'r', 'u', 's', { required: ['role.assign'] });
  });
  it('fails closed when authorization context is absent', async () => {
    required.mockReturnValue([]);
    await expect(guard.canActivate(context({ requestId: 'r', principal: { userId: 'u', sessionId: 's' } }))).rejects.toBeInstanceOf(ForbiddenException);
  });
});
