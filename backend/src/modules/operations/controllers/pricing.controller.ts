import { Body, Controller, ForbiddenException, Get, Post, UseGuards } from '@nestjs/common';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { PricingCalculationDto } from '../dto/operations.dto';
import { PricingService } from '../services/pricing.service';

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricing: PricingService) {}
  @Post('calculate') calculate(@Body() dto: PricingCalculationDto) { return this.pricing.calculate(dto); }
  @Get('rules') @UseGuards(AccessTokenGuard, WorkspaceGuard) rules(@CurrentAuthorizationContext() context: AuthorizationContext) {
    if (!context.organizationId || !context.permissions.has('pricing.read')) throw new ForbiddenException({ code: 'AUTH_PERMISSION_DENIED', message: 'You are not authorized to read pricing rules.', details: null });
    return this.pricing.rules(context.organizationId, context.branchId);
  }
}
