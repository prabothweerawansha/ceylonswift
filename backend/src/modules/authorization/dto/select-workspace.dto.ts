import { IsString, MaxLength, MinLength } from 'class-validator';

export class SelectWorkspaceDto {
  @IsString()
  @MinLength(3)
  @MaxLength(128)
  workspaceId!: string;
}
