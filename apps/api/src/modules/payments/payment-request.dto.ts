import { Type, Transform } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator';
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
  @IsOptional() @IsString() @Length(2, 150)
  payerName?: string;
  @IsOptional() @Transform(digits) @IsString() @Length(4, 4)
  sourceCardLastFour?: string;
}

export class ConfigureOfflineDestinationDto {
  @IsOptional() @IsInt() @Min(1)
  expectedVersion?: number;
  @IsString() @Length(2, 150)
  accountOwner!: string;
  @IsString() @Length(2, 100)
  bankName!: string;
  @Transform(digits) @IsString() @Length(16, 16)
  cardNumber!: string;
  @IsOptional() @Transform(digits) @IsString() @Length(26, 26)
  iban?: string;
  @IsOptional() @Transform(digits) @IsString() @Length(1, 40)
  accountNumber?: string;
  @IsString() @Length(2, 2000)
  instructions!: string;
  @IsBoolean()
  confirmed!: boolean;
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
  @IsString() @Length(3, 500)
  reason!: string;
  @IsInt() @Min(1)
  version!: number;
}

export class ReviewPaymentDto {
  @IsInt() @Min(1)
  version!: number;
}

export class AuthorizeReceiptUploadDto {
  @IsString() @IsIn(['image/jpeg', 'image/png'])
  declaredMime!: 'image/jpeg' | 'image/png';
  @IsInt() @Min(1) @Max(25 * 1024 * 1024)
  declaredSize!: number;
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
