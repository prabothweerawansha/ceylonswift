import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../authorization/guards/permission.guard';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { CreateReviewDto, ModerateReviewDto } from '../dto/landing-page.dto';
import { LandingPageService } from '../services/landing-page.service';

@Controller('reviews')
@UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
export class ReviewsController {
  constructor(private readonly service: LandingPageService) {}

  @Get('mine') @RequirePermissions('review.create')
  mine(@CurrentAuthorizationContext() context: AuthorizationContext) { return this.service.customerReviews(context.userId); }

  @Post() @RequirePermissions('review.create')
  create(@Body() dto: CreateReviewDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.submitReview(dto, context, request.requestId); }

  @Get('moderation') @RequirePermissions('review.moderate')
  moderation() { return this.service.reviewsForModeration(); }

  @Post(':reviewId/moderate') @RequirePermissions('review.moderate')
  moderate(@Param('reviewId') id: string, @Body() dto: ModerateReviewDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.moderateReview(id, dto, context, request.requestId); }
}
