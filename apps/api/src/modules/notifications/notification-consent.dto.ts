import { IsBoolean, IsIn } from 'class-validator';

export class UpdateNotificationConsentDto {
  @IsIn(['IN_APP', 'SMS'])
  channel!: 'IN_APP' | 'SMS';

  @IsIn(['OPTIONAL_UPDATES'])
  purpose!: 'OPTIONAL_UPDATES';

  @IsBoolean()
  granted!: boolean;

  @IsIn(['ONBOARDING', 'SETTINGS'])
  source!: 'ONBOARDING' | 'SETTINGS';
}
