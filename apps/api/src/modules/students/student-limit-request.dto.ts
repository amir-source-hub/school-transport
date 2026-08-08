import { IsOptional, IsString, Length } from 'class-validator';

export class CreateLimitRequestDto {
  @IsString({ message: 'دلیل درخواست باید متن باشد.' })
  @Length(1, 500, { message: 'دلیل درخواست باید بین ۱ تا ۵۰۰ نویسه باشد.' })
  reason!: string;
}

export class RejectLimitRequestDto {
  @IsOptional()
  @IsString({ message: 'دلیل رد باید متن باشد.' })
  @Length(1, 500, { message: 'دلیل رد باید حداکثر ۵۰۰ نویسه باشد.' })
  reason?: string;
}
