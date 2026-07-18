import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { MediaApprovalStatus, PackageStatus, Prisma, ReviewModerationAction, ReviewStatus, SiteRevisionStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import type { AuthorizationContext } from '../../authorization/types/authorization-context';
import type { ContentDecisionDto, CreateLandingRevisionDto, CreateReviewDto, LandingPayloadDto, MediaMetadataDto, ModerateReviewDto, SiteCampaignDto } from '../dto/landing-page.dto';
import { FeaturePolicyService } from './feature-policy.service';

const DEFAULT_CONTENT: LandingPayloadDto = {
  hero: {
    badge: "SRI LANKA'S PREMIUM SPEED COURIER",
    title: 'Sri Lanka Moves Faster with CeylonSwift',
    description: 'Track approved deliveries and discover a smarter CeylonSwift workflow for businesses and tuition classes across Sri Lanka.',
    primaryCta: 'Track a Parcel', primaryAction: 'TRACK_SHIPMENT',
    secondaryCta: 'Join CeylonSwift for Business', secondaryAction: 'JOIN_BUSINESS',
    mediaAlt: 'Stylized delivery route across Sri Lanka', mediaDecorative: false,
  },
  tracker: { title: 'Quick Shipment Tracker', description: 'Enter your CeylonSwift reference code to check the latest public shipment update.' },
  reviewsTitle: 'Verified customer reviews',
  performanceTitle: 'Service performance',
  cards: [
    { stableKey: 'tracking-preview', type: 'TRACKING_PREVIEW', eyebrow: 'Privacy-safe preview', title: 'Live Tracking', status: 'PREVIEW', iconKey: 'route', rows: ['Submit a valid reference below', 'Sensitive details stay protected'], fallback: 'Tracking is available below.', priority: 30, visible: true },
    { stableKey: 'secure-delivery', type: 'STATIC_FEATURE', eyebrow: 'Built-in protection', title: 'Secure Delivery', iconKey: 'shield', rows: ['Verified account access', 'Privacy-aware public tracking', 'Audited operational actions'], priority: 20, visible: true },
    { stableKey: 'on-time', type: 'PERFORMANCE_METRIC', eyebrow: 'Last 90 days', title: 'On-time Performance', iconKey: 'performance', dataSource: 'ON_TIME_90_DAYS', fallback: 'New service data coming soon', priority: 10, visible: true },
  ],
  seoTitle: "CeylonSwift | Sri Lanka's Smart Delivery Service",
  seoDescription: 'Track approved parcels and learn about the CeylonSwift Business and Tuition Open Beta in Sri Lanka.',
};

type UploadedMedia = { originalname: string; mimetype: string; size: number; buffer: Buffer };

@Injectable()
export class LandingPageService {
  private metricCache: { expiresAt: number; value: unknown } | null = null;
  constructor(private readonly prisma: PrismaService, private readonly features: FeaturePolicyService) {}

  async publicPage() {
    const now = new Date();
    const [revision, campaigns, metric, reviews, features] = await Promise.all([
      this.prisma.siteContentRevision.findFirst({ where: { status: SiteRevisionStatus.PUBLISHED, publishedAt: { lte: now } }, orderBy: { version: 'desc' } }),
      this.prisma.siteCampaign.findMany({ where: { approved: true, published: true, startsAt: { lte: now }, OR: [{ endsAt: null }, { endsAt: { gt: now } }] }, orderBy: [{ priority: 'desc' }, { startsAt: 'desc' }], take: 3 }),
      this.onTimeMetric(),
      this.publicReviews(),
      this.features.publicStates(now),
    ]);
    const content = (revision?.payload as unknown as LandingPayloadDto | undefined) ?? DEFAULT_CONTENT;
    return {
      revision: revision?.version ?? 0,
      source: revision ? 'published' : 'safe-default',
      content,
      campaigns: campaigns.map(({ id, stableKey, cardType, title, label, body, ctaLabel, actionKey, priority, startsAt, endsAt }) => ({ id, stableKey, type: cardType, title, label, body, ctaLabel, actionKey, priority, startsAt, endsAt })),
      metrics: { onTime: metric }, reviews,
      features,
      lastPublishedAt: revision?.publishedAt ?? null,
      cache: { public: true, maxAgeSeconds: 60 },
    };
  }

  async createRevision(dto: CreateLandingRevisionDto, context: AuthorizationContext, requestId: string) {
    const latest = await this.prisma.siteContentRevision.aggregate({ _max: { version: true } });
    const revision = await this.prisma.siteContentRevision.create({ data: { version: (latest._max.version ?? 0) + 1, payload: dto.payload as unknown as Prisma.InputJsonValue, changeSummary: dto.changeSummary, createdById: context.userId } });
    await this.audit('WEBSITE_CONTENT_DRAFT_CREATED', revision.id, context, requestId, { version: revision.version });
    return revision;
  }

  async submitRevision(id: string, context: AuthorizationContext, requestId: string) {
    const current = await this.revision(id);
    if (current.createdById !== context.userId || current.status !== SiteRevisionStatus.DRAFT) throw new ConflictException({ code: 'CONTENT_NOT_SUBMITTABLE', message: 'This draft cannot be submitted.', details: null });
    const revision = await this.prisma.siteContentRevision.update({ where: { id }, data: { status: SiteRevisionStatus.PENDING_APPROVAL, submittedAt: new Date() } });
    await this.audit('WEBSITE_CONTENT_SUBMITTED', id, context, requestId);
    return revision;
  }

  async decideRevision(id: string, approve: boolean, dto: ContentDecisionDto, context: AuthorizationContext, requestId: string) {
    const current = await this.revision(id);
    if (current.status !== SiteRevisionStatus.PENDING_APPROVAL) throw new ConflictException({ code: 'CONTENT_NOT_REVIEWABLE', message: 'This revision is not awaiting approval.', details: null });
    if (current.createdById === context.userId) throw new ForbiddenException({ code: 'CONTENT_SELF_APPROVAL_DENIED', message: 'A creator cannot approve their own revision.', details: null });
    if (!approve && !dto.reason) throw new BadRequestException({ code: 'CONTENT_REJECTION_REASON_REQUIRED', message: 'A rejection reason is required.', details: null });
    const revision = await this.prisma.siteContentRevision.update({ where: { id }, data: { status: approve ? SiteRevisionStatus.APPROVED : SiteRevisionStatus.REJECTED, reviewedById: context.userId, reviewedAt: new Date(), rejectionReason: approve ? null : dto.reason, scheduledFor: approve && dto.scheduledFor ? new Date(dto.scheduledFor) : null } });
    await this.audit(approve ? 'WEBSITE_CONTENT_APPROVED' : 'WEBSITE_CONTENT_REJECTED', id, context, requestId, { reason: dto.reason ?? null, scheduledFor: revision.scheduledFor?.toISOString() ?? null });
    return revision;
  }

  async publishRevision(id: string, context: AuthorizationContext, requestId: string) {
    const current = await this.revision(id);
    if (current.status !== SiteRevisionStatus.APPROVED) throw new ConflictException({ code: 'CONTENT_NOT_PUBLISHABLE', message: 'Only approved content can be published.', details: null });
    if (current.scheduledFor && current.scheduledFor > new Date()) throw new ConflictException({ code: 'CONTENT_SCHEDULE_PENDING', message: 'This revision is scheduled for a future time.', details: null });
    const revision = await this.prisma.$transaction(async (tx) => {
      await tx.siteContentRevision.updateMany({ where: { status: SiteRevisionStatus.PUBLISHED }, data: { status: SiteRevisionStatus.ARCHIVED } });
      return tx.siteContentRevision.update({ where: { id }, data: { status: SiteRevisionStatus.PUBLISHED, publishedAt: new Date() } });
    });
    this.metricCache = null;
    await this.audit('WEBSITE_CONTENT_PUBLISHED', id, context, requestId, { version: revision.version });
    return revision;
  }

  async rollbackFrom(id: string, context: AuthorizationContext, requestId: string) {
    const source = await this.revision(id);
    return this.createRevision({ payload: source.payload as unknown as LandingPayloadDto, changeSummary: `Rollback draft from revision ${source.version}` }, context, requestId);
  }

  async createCampaign(dto: SiteCampaignDto, context: AuthorizationContext, requestId: string) {
    const startsAt = new Date(dto.startsAt); const endsAt = dto.endsAt ? new Date(dto.endsAt) : null;
    if (endsAt && endsAt <= startsAt) throw new BadRequestException({ code: 'CAMPAIGN_SCHEDULE_INVALID', message: 'Campaign end time must be after its start time.', details: null });
    const campaign = await this.prisma.siteCampaign.create({ data: { stableKey: dto.stableKey, title: dto.title, label: dto.label, body: dto.body, ctaLabel: dto.ctaLabel, actionKey: dto.actionKey, priority: dto.priority, startsAt, endsAt, createdById: context.userId } });
    await this.audit('WEBSITE_CAMPAIGN_CREATED', campaign.id, context, requestId, { stableKey: campaign.stableKey, startsAt: startsAt.toISOString(), endsAt: endsAt?.toISOString() ?? null });
    return campaign;
  }

  async approveCampaign(id: string, context: AuthorizationContext, requestId: string) {
    const current = await this.prisma.siteCampaign.findUnique({ where: { id } });
    if (!current) throw new NotFoundException({ code: 'CAMPAIGN_NOT_FOUND', message: 'Campaign not found.', details: null });
    if (current.createdById === context.userId) throw new ForbiddenException({ code: 'CAMPAIGN_SELF_APPROVAL_DENIED', message: 'A creator cannot approve their own campaign.', details: null });
    const campaign = await this.prisma.siteCampaign.update({ where: { id }, data: { approved: true, approvedById: context.userId } });
    await this.audit('WEBSITE_CAMPAIGN_APPROVED', id, context, requestId);
    return campaign;
  }

  async publishCampaign(id: string, context: AuthorizationContext, requestId: string) {
    const current = await this.prisma.siteCampaign.findUnique({ where: { id } });
    if (!current?.approved) throw new ConflictException({ code: 'CAMPAIGN_NOT_APPROVED', message: 'Only an approved campaign can be published.', details: null });
    const campaign = await this.prisma.siteCampaign.update({ where: { id }, data: { published: true } });
    await this.audit('WEBSITE_CAMPAIGN_PUBLISHED', id, context, requestId, { startsAt: campaign.startsAt.toISOString(), endsAt: campaign.endsAt?.toISOString() ?? null });
    return campaign;
  }

  async submitReview(dto: CreateReviewDto, context: AuthorizationContext, requestId: string) {
    if (context.workspaceType !== 'PERSONAL') throw new ForbiddenException({ code: 'REVIEW_CUSTOMER_ONLY', message: 'Reviews are available in a personal customer workspace.', details: null });
    const pkg = await this.prisma.package.findFirst({ where: { id: dto.packageId, customerId: context.userId, status: PackageStatus.DELIVERED, deletedAt: null }, select: { id: true, trackingCode: true, deliveredAt: true } });
    if (!pkg) throw new NotFoundException({ code: 'REVIEW_SHIPMENT_NOT_ELIGIBLE', message: 'This shipment is not eligible for a review.', details: null });
    const review = await this.prisma.$transaction(async (tx) => {
      const created = await tx.customerReview.create({ data: { packageId: pkg.id, customerId: context.userId, rating: dto.rating, title: dto.title, body: dto.body, tags: dto.tags.slice(0, 5), publicConsent: dto.publicConsent } });
      await tx.reviewModerationEvent.create({ data: { reviewId: created.id, moderatorId: context.userId, action: ReviewModerationAction.SUBMITTED, snapshot: { rating: created.rating, title: created.title, body: created.body, publicConsent: created.publicConsent }, requestId } });
      return created;
    }).catch((error: unknown) => { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException({ code: 'REVIEW_ALREADY_EXISTS', message: 'A review already exists for this shipment.', details: null }); throw error; });
    return review;
  }

  async moderateReview(id: string, dto: ModerateReviewDto, context: AuthorizationContext, requestId: string) {
    const current = await this.prisma.customerReview.findUnique({ where: { id } });
    if (!current) throw new NotFoundException({ code: 'REVIEW_NOT_FOUND', message: 'Review not found.', details: null });
    if (dto.status === ReviewStatus.APPROVED && !current.publicConsent) throw new ConflictException({ code: 'REVIEW_PUBLIC_CONSENT_REQUIRED', message: 'The customer did not consent to public display.', details: null });
    const action = dto.status === ReviewStatus.APPROVED ? ReviewModerationAction.APPROVED : dto.status === ReviewStatus.HIDDEN ? ReviewModerationAction.HIDDEN : ReviewModerationAction.REJECTED;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customerReview.update({ where: { id }, data: { status: dto.status, moderationReason: dto.reason, moderatedAt: new Date() } });
      await tx.reviewModerationEvent.create({ data: { reviewId: id, moderatorId: context.userId, action, reason: dto.reason, snapshot: { originalStatus: current.status, rating: current.rating, title: current.title, body: current.body, newStatus: dto.status }, requestId } });
      await tx.auditLog.create({ data: { action: `REVIEW_${action}`, outcome: 'SUCCESS', requestId, actorId: context.userId, sessionId: context.sessionId || undefined, organizationId: context.organizationId, branchId: context.branchId, resourceType: 'CustomerReview', resourceId: id, metadata: { reason: dto.reason } } });
      return updated;
    });
  }

  reviewsForModeration() { return this.prisma.customerReview.findMany({ where: { status: { in: [ReviewStatus.PENDING_MODERATION, ReviewStatus.APPROVED] } }, include: { package: { select: { trackingCode: true, status: true, deliveredAt: true } } }, orderBy: { createdAt: 'asc' }, take: 100 }); }
  customerReviews(userId: string) { return this.prisma.customerReview.findMany({ where: { customerId: userId }, orderBy: { createdAt: 'desc' } }); }

  async uploadMedia(file: UploadedMedia | undefined, dto: MediaMetadataDto, context: AuthorizationContext, requestId: string) {
    if (!file || file.size < 1 || file.size > 5 * 1024 * 1024) throw new BadRequestException({ code: 'MEDIA_INVALID_SIZE', message: 'Choose an image up to 5 MB.', details: null });
    const detected = this.imageMetadata(file.buffer);
    if (!detected || detected.mime !== file.mimetype) throw new BadRequestException({ code: 'MEDIA_SIGNATURE_INVALID', message: 'The image file type could not be verified.', details: null });
    const decorative = dto.decorative === 'true';
    if (!decorative && !dto.altText?.trim()) throw new BadRequestException({ code: 'MEDIA_ALT_REQUIRED', message: 'Alternative text is required for meaningful images.', details: null });
    if (detected.width > 6000 || detected.height > 6000) throw new BadRequestException({ code: 'MEDIA_DIMENSIONS_INVALID', message: 'Image dimensions are too large.', details: null });
    const id = randomUUID();
    const ext = detected.mime === 'image/png' ? 'png' : detected.mime === 'image/jpeg' ? 'jpg' : detected.mime === 'image/webp' ? 'webp' : 'avif';
    const asset = await this.prisma.mediaAsset.create({ data: { id, originalFilename: file.originalname.slice(0, 255), safeFilename: `${id}.${ext}`, mimeType: detected.mime, width: detected.width, height: detected.height, sizeBytes: file.size, checksum: createHash('sha256').update(file.buffer).digest('hex'), altText: decorative ? null : dto.altText?.trim(), decorative, data: Uint8Array.from(file.buffer), uploadedById: context.userId } });
    await this.audit('WEBSITE_MEDIA_UPLOADED', asset.id, context, requestId, { mimeType: asset.mimeType, width: asset.width, height: asset.height, sizeBytes: asset.sizeBytes });
    return { ...asset, data: undefined };
  }

  async approveMedia(id: string, context: AuthorizationContext, requestId: string) {
    const asset = await this.prisma.mediaAsset.update({ where: { id }, data: { approvalStatus: MediaApprovalStatus.APPROVED, approvedById: context.userId, approvedAt: new Date() } }).catch(() => { throw new NotFoundException({ code: 'MEDIA_NOT_FOUND', message: 'Media asset not found.', details: null }); });
    await this.audit('WEBSITE_MEDIA_APPROVED', id, context, requestId);
    return { ...asset, data: undefined };
  }

  async publicMedia(id: string) { return this.prisma.mediaAsset.findFirst({ where: { id, approvalStatus: MediaApprovalStatus.APPROVED }, select: { data: true, mimeType: true, safeFilename: true, checksum: true } }); }

  private async publicReviews() {
    const reviews = await this.prisma.customerReview.findMany({ where: { status: ReviewStatus.APPROVED, publicConsent: true, package: { status: PackageStatus.DELIVERED } }, include: { customer: { include: { profile: true } } }, orderBy: { moderatedAt: 'desc' }, take: 8 });
    return reviews.map((review) => ({ id: review.id, rating: review.rating, title: review.title, body: review.body, tags: review.tags, customer: this.maskName(review.customer.profile?.displayName), verifiedDelivery: true, createdAt: review.createdAt }));
  }

  private async onTimeMetric() {
    if (this.metricCache && this.metricCache.expiresAt > Date.now()) return this.metricCache.value;
    const periodEnd = new Date(); const periodStart = new Date(periodEnd.getTime() - 90 * 24 * 60 * 60 * 1000);
    const rows = await this.prisma.package.findMany({ where: { status: PackageStatus.DELIVERED, deliveredAt: { gte: periodStart, lte: periodEnd }, promisedDeliveryAt: { not: null }, deletedAt: null }, select: { deliveredAt: true, promisedDeliveryAt: true } });
    const sampleSize = rows.length; const onTime = rows.filter((row) => row.deliveredAt!.getTime() <= row.promisedDeliveryAt!.getTime()).length;
    const value = sampleSize < 20 ? { available: false, reason: 'MINIMUM_SAMPLE_NOT_MET', sampleSize, periodStart, periodEnd, label: 'New service data coming soon' } : { available: true, percentage: Math.round((onTime / sampleSize) * 1000) / 10, sampleSize, periodStart, periodEnd, lastUpdatedAt: periodEnd, methodology: 'Delivered shipments with a promised delivery time; on time when deliveredAt is at or before promisedDeliveryAt. Cancelled, returned, failed, and missing-promise records are excluded.' };
    this.metricCache = { expiresAt: Date.now() + 5 * 60 * 1000, value };
    return value;
  }

  private imageMetadata(data: Buffer): { mime: string; width: number; height: number } | null {
    if (data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { mime: 'image/png', width: data.readUInt32BE(16), height: data.readUInt32BE(20) };
    if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
      const kind = data.toString('ascii', 12, 16); if (kind === 'VP8X' && data.length >= 30) return { mime: 'image/webp', width: 1 + data.readUIntLE(24, 3), height: 1 + data.readUIntLE(27, 3) };
    }
    if (data.length >= 16 && data.toString('ascii', 4, 8) === 'ftyp' && ['avif','avis'].includes(data.toString('ascii', 8, 12))) { const ispe = data.indexOf(Buffer.from('ispe')); if (ispe >= 0 && ispe + 12 <= data.length) return { mime: 'image/avif', width: data.readUInt32BE(ispe + 4), height: data.readUInt32BE(ispe + 8) }; }
    if (data.length > 4 && data[0] === 0xff && data[1] === 0xd8) { let offset = 2; while (offset + 9 < data.length) { if (data[offset] !== 0xff) { offset += 1; continue; } const marker = data[offset + 1]!; const length = data.readUInt16BE(offset + 2); if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { mime: 'image/jpeg', height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) }; if (length < 2) break; offset += 2 + length; } }
    return null;
  }

  private revision(id: string) { return this.prisma.siteContentRevision.findUnique({ where: { id } }).then((value) => { if (!value) throw new NotFoundException({ code: 'CONTENT_REVISION_NOT_FOUND', message: 'Content revision not found.', details: null }); return value; }); }
  private maskName(name?: string | null) { if (!name?.trim()) return 'Verified customer'; const parts = name.trim().split(/\s+/); return parts.length === 1 ? parts[0] : `${parts[0]} ${parts.at(-1)![0]}.`; }
  private audit(action: string, resourceId: string, context: AuthorizationContext, requestId: string, metadata?: Prisma.InputJsonObject) { return this.prisma.auditLog.create({ data: { action, outcome: 'SUCCESS', requestId, actorId: context.userId, sessionId: context.sessionId || undefined, organizationId: context.organizationId, branchId: context.branchId, resourceType: 'WebsiteContent', resourceId, metadata } }); }
}
