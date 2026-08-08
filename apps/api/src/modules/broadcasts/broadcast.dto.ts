import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  Matches,
  ValidateIf,
} from 'class-validator';

export class CreateBroadcastDto {
  @IsString()
  @Length(3, 120)
  name!: string;

  @IsString()
  @Length(2, 500)
  smsContent!: string;

  @IsOptional()
  @IsString()
  @Length(2, 200)
  inAppTitle?: string;

  @ValidateIf((value: CreateBroadcastDto) => Boolean(value.inAppTitle))
  @IsString()
  @Length(2, 1000)
  inAppContent?: string;

  @IsISO8601()
  scheduledAt!: string;

  @IsISO8601()
  expiresAt!: string;

  @IsBoolean()
  @Type(() => Boolean)
  featureEnabled!: boolean;
}

export class TestBroadcastDto {
  @IsString()
  @Matches(/^09\d{9}$/)
  phoneNumber!: string;
}
