import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsIn, IsISO8601, IsObject, IsOptional, IsString, IsUUID, Length, Matches, MaxLength, Min, Max, IsInt, ValidateNested } from 'class-validator';
import { FeaturePolicyScope, FeaturePolicyState, ReviewStatus, SiteCardType } from '@prisma/client';

export const LANDING_ACTIONS = ['SEND_PARCEL', 'TRACK_SHIPMENT', 'JOIN_BUSINESS', 'OPEN_LOGIN', 'SCROLL_TO_REVIEWS', 'OPEN_RATE_CALCULATOR'] as const;

export class LandingHeroDto {
  @IsString() @Length(3, 80) badge!: string;
  @IsString() @Length(8, 120) title!: string;
  @IsString() @Length(20, 320) description!: string;
  @IsString() @Length(2, 48) primaryCta!: string;
  @IsIn(LANDING_ACTIONS) primaryAction!: string;
  @IsString() @Length(2, 48) secondaryCta!: string;
  @IsIn(LANDING_ACTIONS) secondaryAction!: string;
  @IsOptional() @IsUUID() mediaAssetId?: string;
  @IsString() @MaxLength(240) mediaAlt!: string;
  @IsBoolean() mediaDecorative!: boolean;
}

export class LandingTrackerDto {
  @IsString() @Length(3, 100) title!: string;
  @IsString() @Length(10, 240) description!: string;
}

export class LandingCardDto {
  @Matches(/^[a-z0-9][a-z0-9._-]{2,63}$/) stableKey!: string;
  @IsEnum(SiteCardType) type!: SiteCardType;
  @IsOptional() @IsString() @MaxLength(32) eyebrow?: string;
  @IsString() @Length(2, 72) title!: string;
  @IsOptional() @IsString() @MaxLength(24) status?: string;
  @IsOptional() @Matches(/^[a-z0-9-]{2,32}$/) iconKey?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(80, { each: true }) rows?: string[];
  @IsOptional() @IsString() @MaxLength(48) ctaLabel?: string;
  @IsOptional() @IsIn(LANDING_ACTIONS) actionKey?: string;
  @IsOptional() @IsString() @MaxLength(64) dataSource?: string;
  @IsOptional() @IsString() @MaxLength(120) fallback?: string;
  @IsOptional() @IsInt() @Min(0) @Max(1000) priority = 0;
  @IsBoolean() visible!: boolean;
}

export class LandingPayloadDto {
  @ValidateNested() @Type(() => LandingHeroDto) hero!: LandingHeroDto;
  @ValidateNested() @Type(() => LandingTrackerDto) tracker!: LandingTrackerDto;
  @IsString() @Length(3, 100) reviewsTitle!: string;
  @IsString() @Length(3, 100) performanceTitle!: string;
  @IsArray() @ValidateNested({ each: true }) @Type(() => LandingCardDto) cards!: LandingCardDto[];
  @IsOptional() @IsString() @MaxLength(160) seoTitle?: string;
  @IsOptional() @IsString() @MaxLength(320) seoDescription?: string;
}

export class CreateLandingRevisionDto {
  @ValidateNested() @Type(() => LandingPayloadDto) payload!: LandingPayloadDto;
  @IsOptional() @IsString() @MaxLength(500) changeSummary?: string;
}

export class ContentDecisionDto {
  @IsOptional() @IsString() @Length(3, 500) reason?: string;
  @IsOptional() @IsISO8601() scheduledFor?: string;
}

export class CreateReviewDto {
  @IsUUID() packageId!: string;
  @Type(() => Number) @IsInt() @Min(1) @Max(5) rating!: number;
  @IsOptional() @IsString() @MaxLength(120) title?: string;
  @IsString() @Length(20, 1500) body!: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @MaxLength(40, { each: true }) tags: string[] = [];
  @IsBoolean() publicConsent!: boolean;
}

export class ModerateReviewDto {
  @IsIn([ReviewStatus.APPROVED, ReviewStatus.REJECTED, ReviewStatus.HIDDEN]) status!: ReviewStatus;
  @IsString() @Length(3, 500) reason!: string;
}

export class MediaMetadataDto {
  @IsOptional() @IsString() @MaxLength(240) altText?: string;
  @IsOptional() @IsIn(['true', 'false']) decorative = 'false';
}

export class SiteCampaignDto {
  @Matches(/^[a-z0-9][a-z0-9._-]{2,63}$/) stableKey!: string;
  @IsString() @Length(2, 120) title!: string;
  @IsOptional() @IsString() @MaxLength(48) label?: string;
  @IsString() @Length(3, 240) body!: string;
  @IsOptional() @IsString() @MaxLength(48) ctaLabel?: string;
  @IsOptional() @IsIn(LANDING_ACTIONS) actionKey?: string;
  @Type(() => Number) @IsInt() @Min(0) @Max(1000) priority = 0;
  @IsISO8601() startsAt!: string;
  @IsOptional() @IsISO8601() endsAt?: string;
}

export class UpsertFeaturePolicyDto {
  @IsEnum(FeaturePolicyScope) scopeType!: FeaturePolicyScope;
  @IsString() @Length(1, 100) scopeId!: string;
  @IsEnum(FeaturePolicyState) state!: FeaturePolicyState;
  @IsOptional() @IsObject() configuration?: Record<string, unknown>;
  @IsISO8601() effectiveFrom!: string;
  @IsOptional() @IsISO8601() effectiveUntil?: string;
  @Type(() => Number) @IsInt() @Min(0) expectedVersion!: number;
  @IsString() @Length(5, 500) reason!: string;
}
