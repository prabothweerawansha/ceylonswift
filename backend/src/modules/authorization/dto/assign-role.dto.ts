import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AssignRoleDto {
  @IsUUID()
  roleId!: string;

  @IsOptional()
  @IsUUID()
  branchId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
