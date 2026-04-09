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
import { AppointmentService } from './appointment.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { UserRole, AppointmentStatus } from 'src/common/enums';
import type { AuthUser } from 'src/auth/jwt.stratergy';

@ApiTags('Appointments')
@Controller('appointments')
@ApiBearerAuth()
export class AppointmentController {
  constructor(private readonly appointmentService: AppointmentService) {}

  // POST /appointments — Admin or Receptionist books
  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Book a new appointment (Admin / Receptionist)' })
  create(@Body() dto: CreateAppointmentDto): Promise<object> {
    return this.appointmentService.create(dto);
  }

  // GET /appointments?customerId=&stylistId=&appointmentStatus=&date=&page=
  @Get()
  @ApiOperation({ summary: 'List appointments with optional filters' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'stylistId', required: false })
  @ApiQuery({ name: 'appointmentStatus', required: false, enum: AppointmentStatus })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @Query('customerId') customerId?: string,
    @Query('stylistId') stylistId?: string,
    @Query('appointmentStatus') appointmentStatus?: AppointmentStatus,
    @Query('date') date?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{ data: object[]; meta: object }> {
    return this.appointmentService.findAll({
      customerId: customerId ? parseInt(customerId, 10) : undefined,
      stylistId: stylistId ? parseInt(stylistId, 10) : undefined,
      appointmentStatus,
      date,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  // GET /appointments/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single appointment by ID (with services)' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<object> {
    return this.appointmentService.findOne(id);
  }

  // GET /appointments/schedule/stylist/:stylistId?date=
  // Stylist sees own schedule; Admin sees any stylist's schedule
  @Get('schedule/stylist/:stylistId')
  @ApiOperation({ summary: "Get a stylist's daily schedule for a date" })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  getDailySchedule(
    @Param('stylistId', ParseIntPipe) stylistId: number,
    @Query('date') date: string,
    @User() user: AuthUser,
  ): Promise<object[]> {
    // Stylists can only view their own schedule
    const targetId =
      user.role === UserRole.STYLIST ? user.stylistId ?? stylistId : stylistId;
    return this.appointmentService.getDailySchedule(targetId, date);
  }

  // PATCH /appointments/:id/cancel
  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Cancel a scheduled appointment and release slots (Admin / Receptionist)' })
  cancel(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.appointmentService.cancel(id);
  }

  // PATCH /appointments/:id/no-show
  @Patch(':id/no-show')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Mark appointment as no-show (Admin / Receptionist)' })
  markNoShow(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.appointmentService.markNoShow(id);
  }

  // PATCH /appointments/:id/services/:serviceId/complete
  @Patch(':id/services/:serviceId/complete')
  @Roles(UserRole.ADMIN, UserRole.STYLIST, UserRole.RECEPTIONIST)
  @ApiOperation({
    summary:
      'Mark a specific service as completed. When all services are done, appointment auto-completes and slots are released.',
  })
  completeService(
    @Param('id', ParseIntPipe) id: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ): Promise<{ message: string }> {
    return this.appointmentService.completeService(id, serviceId);
  }
}
