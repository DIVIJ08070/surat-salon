import { IsEnum, IsInt, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from 'src/common/enums';

export class CreateBillDto {
  @ApiProperty({ example: 1, description: 'Appointment ID to generate bill for' })
  @IsInt()
  appointmentId!: number;

  @ApiPropertyOptional({ example: 50.00, description: 'Discount amount (default: 0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiPropertyOptional({ example: 18.00, description: 'Tax amount (default: 0)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tax?: number;
}

export class PayBillDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.UPI, description: 'Payment method' })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;
}
