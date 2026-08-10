import { Transform } from 'class-transformer';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';
import { normalizeIranianDigits } from '../../common/iranian-national-id';

const number = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? Number(normalizeIranianDigits(value).trim()) : value;

export class AcceptPriceDto {
  @IsOptional()
  @IsIn(['FULL', 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS'])
  planType?: 'FULL' | 'PREPAYMENT_PLUS_FOUR_INSTALLMENTS';
}

export class CreatePriceDto {
  @Transform(number)
  @IsInt()
  @Min(1)
  @Max(2_147_483_647)
  totalAmount!: number;
  @IsOptional()
  @IsIn(['IRR'])
  currency?: string;
  @IsOptional()
  @IsBoolean()
  fullPaymentAllowed?: boolean;
  @IsOptional()
  @IsBoolean()
  installmentPaymentAllowed?: boolean;
  @IsOptional()
  @Transform(number)
  @IsInt()
  @Min(0)
  @Max(2_147_483_647)
  prepaymentAmount?: number;
  @IsOptional()
  @Transform(number)
  @IsInt()
  @Min(1)
  @Max(12)
  installmentCount?: number;
  @IsOptional()
  @IsString()
  @Length(1, 500)
  description?: string;
}
