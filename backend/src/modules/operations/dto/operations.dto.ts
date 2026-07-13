import { Type } from 'class-transformer';
import {
  AddressType,
  CustomerRequestStatus,
  HubStatus,
  PackageStatus,
  PaymentMode,
} from '@prisma/client';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsPhoneNumber,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OperationalListQueryDto {
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsEnum(PackageStatus) status?: PackageStatus;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsUUID() riderId?: string;
  @IsOptional() @IsISO8601() from?: string;
  @IsOptional() @IsISO8601() to?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sort: 'asc' | 'desc' = 'desc';
}

export class RequestListQueryDto {
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsEnum(CustomerRequestStatus) status?: CustomerRequestStatus;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sort: 'asc' | 'desc' = 'desc';
}

export class AddressInputDto {
  @IsOptional() @IsEnum(AddressType) type: AddressType = AddressType.OTHER;
  @IsOptional() @IsString() @Length(1, 100) label?: string;
  @IsString() @Length(3, 255) line1!: string;
  @IsOptional() @IsString() @MaxLength(255) line2?: string;
  @IsString() @Length(2, 160) locality!: string;
  @IsOptional() @IsString() @MaxLength(160) district?: string;
  @IsOptional() @IsString() @MaxLength(32) postalCode?: string;
  @IsOptional() @Matches(/^[A-Z]{2}$/) countryCode = 'LK';
}

export class DeliveryDetailsDto {
  @IsString() @Length(2, 160) recipientName!: string;
  @IsOptional() @IsPhoneNumber() recipientPhone?: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.01) @Max(10000) weightKg!: number;
  @IsString() @Length(2, 64) serviceLevel!: string;
  @IsEnum(PaymentMode) paymentMode!: PaymentMode;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000000) codAmount?: number;
  @IsUUID() originHubId!: string;
  @IsUUID() destinationHubId!: string;
}

export class CustomerRequestCreateDto extends DeliveryDetailsDto {
  @ValidateNested() @Type(() => AddressInputDto) pickupAddress!: AddressInputDto;
  @ValidateNested() @Type(() => AddressInputDto) deliveryAddress!: AddressInputDto;
}

export class CustomerRequestUpdateDto {
  @IsOptional() @IsString() @Length(2, 160) recipientName?: string;
  @IsOptional() @IsPhoneNumber() recipientPhone?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.01) @Max(10000) weightKg?: number;
  @IsOptional() @IsString() @Length(2, 64) serviceLevel?: string;
  @IsOptional() @IsEnum(PaymentMode) paymentMode?: PaymentMode;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000000) codAmount?: number;
  @IsOptional() @IsUUID() originHubId?: string;
  @IsOptional() @IsUUID() destinationHubId?: string;
  @IsOptional() @ValidateNested() @Type(() => AddressInputDto) pickupAddress?: AddressInputDto;
  @IsOptional() @ValidateNested() @Type(() => AddressInputDto) deliveryAddress?: AddressInputDto;
}

export class PackageCreateDto extends CustomerRequestCreateDto {
  @IsOptional() @IsUUID() customerId?: string;
}

export class PackageUpdateDto {
  @IsOptional() @IsString() @Length(2, 160) recipientName?: string;
  @IsOptional() @IsPhoneNumber() recipientPhone?: string;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.01) @Max(10000) weightKg?: number;
  @IsOptional() @IsString() @Length(2, 64) serviceLevel?: string;
  @IsOptional() @IsUUID() destinationHubId?: string;
  @IsOptional() @ValidateNested() @Type(() => AddressInputDto) destinationAddress?: AddressInputDto;
  @IsInt() @Min(1) expectedVersion!: number;
}

export class StatusTransitionDto {
  @IsEnum(PackageStatus) status!: PackageStatus;
  @IsOptional() @IsString() @MaxLength(500) publicMessage?: string;
  @IsOptional() @IsUUID() hubId?: string;
  @IsInt() @Min(1) expectedVersion!: number;
}

export class CancelDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsInt() @Min(1) expectedVersion!: number;
}

export class AssignmentDto {
  @IsUUID() riderId!: string;
  @IsOptional() @IsString() @MaxLength(500) notes?: string;
  @IsInt() @Min(1) expectedVersion!: number;
}

export class UnassignDto {
  @IsOptional() @IsString() @MaxLength(500) reason?: string;
  @IsInt() @Min(1) expectedVersion!: number;
}

export class PricingCalculationDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 3 }) @Min(0.01) @Max(10000) weightKg!: number;
  @IsUUID() originHubId!: string;
  @IsUUID() destinationHubId!: string;
  @IsString() @Length(2, 64) serviceLevel!: string;
  @IsEnum(PaymentMode) paymentMode!: PaymentMode;
  @IsOptional() @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(10000000) codAmount?: number;
}

export class HubQueryDto {
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsEnum(HubStatus) status?: HubStatus;
}

export class HubCreateDto {
  @IsUUID() branchId!: string;
  @Matches(/^[A-Z0-9][A-Z0-9-]{1,63}$/) code!: string;
  @IsString() @Length(2, 200) name!: string;
  @IsOptional() @IsEnum(HubStatus) status: HubStatus = HubStatus.ACTIVE;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) capacity?: number;
  @IsOptional() @IsString() @MaxLength(160) district?: string;
}

export class HubUpdateDto {
  @IsOptional() @IsString() @Length(2, 200) name?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000000) capacity?: number;
  @IsOptional() @IsString() @MaxLength(160) district?: string;
}

export class HubStatusDto {
  @IsEnum(HubStatus) status!: HubStatus;
}

