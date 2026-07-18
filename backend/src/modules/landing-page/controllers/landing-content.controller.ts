import { Body, Controller, Get, Param, Post, Put, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { RequestWithId } from '../../../common/types/request-with-id';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import { CurrentAuthorizationContext } from '../../authorization/decorators/current-authorization-context.decorator';
import { RequirePermissions } from '../../authorization/decorators/require-permissions.decorator';
import { PermissionGuard } from '../../authorization/guards/permission.guard';
import { WorkspaceGuard } from '../../authorization/guards/workspace.guard';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import { ContentDecisionDto, CreateLandingRevisionDto, MediaMetadataDto, SiteCampaignDto, UpsertFeaturePolicyDto } from '../dto/landing-page.dto';
import { FeaturePolicyService } from '../services/feature-policy.service';
import { LandingPageService } from '../services/landing-page.service';

@Controller('website-content')
@UseGuards(AccessTokenGuard, WorkspaceGuard, PermissionGuard)
export class LandingContentController {
  constructor(private readonly service: LandingPageService, private readonly features: FeaturePolicyService) {}

  @Get('feature-policies') @RequirePermissions('feature_policy.read')
  featurePolicies(@CurrentAuthorizationContext() context: AuthorizationContext) { return this.features.list(context); }

  @Put('feature-policies/:featureKey') @RequirePermissions('feature_policy.manage')
  upsertFeaturePolicy(@Param('featureKey') featureKey: string, @Body() dto: UpsertFeaturePolicyDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) {
    return this.features.upsert(featureKey, dto, context, request.requestId);
  }

  @Post('revisions') @RequirePermissions('website_content.edit')
  create(@Body() dto: CreateLandingRevisionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.createRevision(dto, context, request.requestId); }

  @Post('revisions/:revisionId/submit') @RequirePermissions('website_content.submit')
  submit(@Param('revisionId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.submitRevision(id, context, request.requestId); }

  @Post('revisions/:revisionId/approve') @RequirePermissions('website_content.approve')
  approve(@Param('revisionId') id: string, @Body() dto: ContentDecisionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.decideRevision(id, true, dto, context, request.requestId); }

  @Post('revisions/:revisionId/reject') @RequirePermissions('website_content.approve')
  reject(@Param('revisionId') id: string, @Body() dto: ContentDecisionDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.decideRevision(id, false, dto, context, request.requestId); }

  @Post('revisions/:revisionId/publish') @RequirePermissions('website_content.publish')
  publish(@Param('revisionId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.publishRevision(id, context, request.requestId); }

  @Post('revisions/:revisionId/rollback') @RequirePermissions('website_content.rollback')
  rollback(@Param('revisionId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.rollbackFrom(id, context, request.requestId); }

  @Post('media') @RequirePermissions('website_media.upload') @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  upload(@UploadedFile() file: { originalname: string; mimetype: string; size: number; buffer: Buffer } | undefined, @Body() dto: MediaMetadataDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.uploadMedia(file, dto, context, request.requestId); }

  @Post('media/:assetId/approve') @RequirePermissions('website_media.approve')
  approveMedia(@Param('assetId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.approveMedia(id, context, request.requestId); }

  @Post('campaigns') @RequirePermissions('website_content.edit')
  createCampaign(@Body() dto: SiteCampaignDto, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.createCampaign(dto, context, request.requestId); }

  @Post('campaigns/:campaignId/approve') @RequirePermissions('website_content.approve')
  approveCampaign(@Param('campaignId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.approveCampaign(id, context, request.requestId); }

  @Post('campaigns/:campaignId/publish') @RequirePermissions('website_content.publish')
  publishCampaign(@Param('campaignId') id: string, @CurrentAuthorizationContext() context: AuthorizationContext, @Req() request: RequestWithId) { return this.service.publishCampaign(id, context, request.requestId); }
}
