import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentProvider } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreatePaymentDto {
  @ApiPropertyOptional({ description: 'Dispatch request id (preferred)' })
  @ValidateIf((o: CreatePaymentDto) => !o.tripId)
  @IsString()
  @MinLength(1)
  requestId?: string;

  @ApiPropertyOptional({ description: 'Trip id (resolved to request)' })
  @ValidateIf((o: CreatePaymentDto) => !o.requestId)
  @IsString()
  @MinLength(1)
  tripId?: string;

  @ApiProperty({ enum: PaymentProvider })
  @IsEnum(PaymentProvider)
  provider!: PaymentProvider;

  @ApiProperty({
    description: 'Client idempotency key (unique per payment attempt)',
    example: 'cust-req-abc-1',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  idempotencyKey!: string;

  @ApiPropertyOptional({
    description:
      'If sent, must equal server totalBillCents (authoritative check)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  clientAmountCents?: number;
}
