import { IsEnum, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DeviceType } from '@prisma/client';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  identifier!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(256)
  password!: string;

  @IsEnum(DeviceType)
  clientType!: DeviceType;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  deviceName?: string;
}
