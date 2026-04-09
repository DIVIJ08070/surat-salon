import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { BillService } from './bill.service';
import { CreateBillDto, PayBillDto } from './dto/bill.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole, BillStatus } from 'src/common/enums';

@ApiTags('Bills')
@Controller('bills')
@ApiBearerAuth()
export class BillController {
  constructor(private readonly billService: BillService) { }

  // POST /bills — Admin/Receptionist generates bill for a completed appointment
  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Generate a bill for a completed appointment (Admin / Receptionist)' })
  create(@Body() dto: CreateBillDto): Promise<object> {
    return this.billService.create(dto);
  }

  // GET /bills?billStatus=&page=
  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'List all bills with optional status filter (Admin / Receptionist)' })
  @ApiQuery({ name: 'billStatus', required: false, enum: BillStatus })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('billStatus') billStatus?: BillStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: object[]; meta: object }> {
    return this.billService.findAll({
      billStatus,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  // GET /bills/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a bill by ID' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<object> {
    return this.billService.findOne(id);
  }

  // GET /bills/appointment/:appointmentId
  @Get('appointment/:appointmentId')
  @ApiOperation({ summary: 'Get the bill for a specific appointment' })
  findByAppointment(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
  ): Promise<object> {
    return this.billService.findByAppointment(appointmentId);
  }

  // PATCH /bills/:id/pay — Record payment
  @Patch(':id/pay')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Mark a bill as paid with payment method (Admin / Receptionist)' })
  pay(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: PayBillDto,
  ): Promise<object> {
    return this.billService.pay(id, dto);
  }

  // PATCH /bills/:id/refund — Admin only
  @Patch(':id/refund')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Refund a paid bill (Admin only)' })
  refund(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.billService.refund(id);
  }
}
