import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsDateString, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
import { BadRequestException, createParamDecorator, ExecutionContext, Injectable, PipeTransform } from '@nestjs/common';
import { normalizeIranianDigits } from '../../common/iranian-national-id';

const digits = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? normalizeIranianDigits(value).trim() : value;

export class VerifyOnlinePaymentDto {
  @Transform(digits) @IsString() @Length(1, 255)
  gatewayTransactionId!: string;
}

export class OfflinePaymentDto {
  @Transform(digits) @IsDateString({ strict: true })
  paidAt!: string;
  @Transform(digits) @IsString() @Length(1, 100)
  referenceNumber!: string;
  @IsOptional() @IsString() @Length(1, 500)
  description?: string;
}

export class InstallmentItemDto {
  @Transform(({ value }) => typeof value === 'string' ? Number(normalizeIranianDigits(value).trim()) : value)
  @IsInt() @Min(1) @Max(2_147_483_647)
  amount!: number;
  @Transform(digits) @IsDateString({ strict: true })
  dueDate!: string;
}

export class ConfigureInstallmentsDto {
  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(12)
  @ValidateNested({ each: true }) @Type(() => InstallmentItemDto)
  items!: InstallmentItemDto[];
}

export class RejectPaymentDto {
  @IsOptional() @IsString() @Length(1, 500)
  reason?: string;
}

@Injectable()
export class IdempotencyKeyPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== 'string') throw new BadRequestException('Idempotency-Key is required.');
    const key = value.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{7,127}$/.test(key)) {
      throw new BadRequestException('Idempotency-Key has an invalid format.');
    }
    return key;
  }
}

export const IdempotencyKey = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    new IdempotencyKeyPipe().transform(
      context.switchToHttp().getRequest<{ headers: Record<string, unknown> }>().headers[
        'idempotency-key'
      ],
    ),
);
