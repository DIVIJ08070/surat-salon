import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { TimeSlotService } from './time-slot.service';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { BulkGenerateSlotsDto } from './dto/bulk-generate-slots.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole, SlotStatus } from 'src/common/enums';

@ApiTags('Time Slots')
@ApiBearerAuth()
@Controller('time-slots')
export class TimeSlotController {
  constructor(private readonly timeSlotService: TimeSlotService) {}

  // POST /time-slots/generate — Admin generates slots for a stylist
  @Post('generate')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate time slots for a stylist over a date range (Admin only)' })
  generate(@Body() dto: GenerateSlotsDto): Promise<{ message: string; created: number }> {
    return this.timeSlotService.generate(dto);
  }

  // POST /time-slots/generate-bulk — Admin generates slots for all stylists
  @Post('generate-bulk')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate time slots for ALL active stylists over a month (Admin only)' })
  generateBulk(@Body() dto: BulkGenerateSlotsDto): Promise<{ message: string; created: number; stylistsProcessed: number }> {
    return this.timeSlotService.generateBulk(dto);
  }

  // GET /time-slots?stylistId=&date=&slotStatus=&page=
  @Get()
  @ApiOperation({ summary: 'List time slots with optional filters' })
  @ApiQuery({ name: 'stylistId', required: false, description: 'Filter by stylist ID' })
  @ApiQuery({ name: 'date', required: false, description: 'Filter by date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'slotStatus', required: false, enum: SlotStatus, description: 'Filter by slot status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 10)' })
  findAll(
    @Query('stylistId') stylistId?: string,
    @Query('date') date?: string,
    @Query('slotStatus') slotStatus?: SlotStatus,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<{
    data: object[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    return this.timeSlotService.findAll({
      stylistId: stylistId ? parseInt(stylistId, 10) : undefined,
      date,
      slotStatus,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
    });
  }

  // GET /time-slots/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single time slot by ID' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<object> {
    return this.timeSlotService.findOne(id);
  }

  // GET /time-slots/available?stylistId=&date=  — used by appointment booking UI
  @Get('available')
  @ApiOperation({ summary: 'Get all available slots for a stylist on a specific date' })
  @ApiQuery({ name: 'stylistId', required: true })
  @ApiQuery({ name: 'date', required: true, description: 'YYYY-MM-DD' })
  getAvailable(
    @Query('stylistId') stylistId: string,
    @Query('date') date: string,
  ): Promise<object[]> {
    return this.timeSlotService.getAvailableSlots(parseInt(stylistId, 10), date);
  }

  // DELETE /time-slots/stylist/:stylistId/date/:date  — Admin removes available slots for a date
  @Delete('stylist/:stylistId/date/:date')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove all AVAILABLE slots for a stylist on a date (Admin only)' })
  removeForDate(
    @Param('stylistId', ParseIntPipe) stylistId: number,
    @Param('date') date: string,
  ): Promise<{ message: string; deleted: number }> {
    return this.timeSlotService.removeForDate(stylistId, date);
  }
}
