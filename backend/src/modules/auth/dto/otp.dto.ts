import { IsIn, IsNotEmpty, IsString, IsUUID, Length, MaxLength } from 'class-validator';

export class OtpRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(320)
  identifier!: string;

  @IsIn(['EMAIL', 'SMS'])
  channel!: 'EMAIL' | 'SMS';

  @IsIn(['LOGIN', 'STEP_UP', 'VERIFY_CONTACT'])
  purpose!: 'LOGIN' | 'STEP_UP' | 'VERIFY_CONTACT';
}

export class OtpVerifyDto {
  @IsUUID()
  challengeId!: string;

  @IsString()
  @Length(6, 8)
  code!: string;
}
