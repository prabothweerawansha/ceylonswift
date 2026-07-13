import { Type } from 'class-transformer';
import { AccountStatus, ApprovalStatus, EmployeeStatus, RiderStatus } from '@prisma/client';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsEmail, IsEnum, IsIn, IsNumber, IsOptional, IsPhoneNumber, IsString, IsUUID, Length, Matches, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class DirectoryQueryDto {
  @IsOptional() @IsUUID() cursor?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) @Max(100) limit = 25;
  @IsOptional() @IsString() @MaxLength(120) search?: string;
  @IsOptional() @IsString() @MaxLength(64) status?: string;
  @IsOptional() @IsString() @MaxLength(100) role?: string;
  @IsOptional() @IsUUID() branchId?: string;
  @IsOptional() @IsIn(['asc', 'desc']) sort: 'asc' | 'desc' = 'asc';
}

export class AccountStatusDto { @IsEnum(AccountStatus) status!: AccountStatus; @IsOptional() @IsString() @MaxLength(500) reason?: string; }
export class EmployeeStatusDto { @IsEnum(EmployeeStatus) status!: EmployeeStatus; @IsOptional() @IsString() @MaxLength(500) reason?: string; }
export class RiderStatusDto { @IsEnum(RiderStatus) status!: RiderStatus; @IsOptional() @IsString() @MaxLength(500) reason?: string; }
export class EmployeeUpdateDto { @IsOptional() @IsString() @Length(2, 160) jobTitle?: string; }
export class BranchAssignmentDto { @IsUUID() branchId!: string; @IsOptional() @IsString() @MaxLength(500) reason?: string; }
export class RiderUpdateDto {
  @IsOptional() @IsString() @Length(2, 64) vehicleType?: string;
  @IsOptional() @IsString() @Length(2, 64) vehicleIdentifier?: string;
  @IsOptional() @IsString() @Length(2, 128) licenseReference?: string;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(10000) capacityKg?: number;
}

export class InvitationCreateDto {
  @ValidateIf((value: InvitationCreateDto) => !value.phone) @IsEmail() @MaxLength(320) email?: string;
  @ValidateIf((value: InvitationCreateDto) => !value.email) @IsPhoneNumber() phone?: string;
  @IsUUID() branchId!: string;
  @IsString() @Length(2, 160) jobTitle!: string;
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(3) @IsString({ each: true }) @Matches(/^[A-Z][A-Z0-9_]{1,99}$/, { each: true }) roleKeys!: string[];
  @IsOptional() @Type(() => Number) @IsNumber() @Min(15) @Max(10080) expiresInMinutes = 1440;
}

export class InvitationAcceptDto {
  @IsString() @MinLength(32) @MaxLength(512) token!: string;
  @IsString() @Length(2, 160) displayName!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}

export class DecisionDto { @IsOptional() @IsString() @MaxLength(1000) reason?: string; }
export class ApprovalQueryDto extends DirectoryQueryDto { @IsOptional() @IsEnum(ApprovalStatus) declare status?: ApprovalStatus; }
