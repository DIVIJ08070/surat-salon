import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { ReportService } from './report.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';

@ApiTags('Reports')
@Controller('reports')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // GET /reports/daily-summary?date=2026-04-09
  @Get('daily-summary')
  @ApiOperation({
    summary: 'Daily business summary — completed bookings, revenue, no-shows, peak hour (Admin only)',
  })
  @ApiQuery({ name: 'date', required: true, description: 'Date in YYYY-MM-DD format' })
  dailySummary(@Query('date') date: string): Promise<object> {
    return this.reportService.dailySummary(date);
  }

  // GET /reports/service-performance
  @Get('service-performance')
  @ApiOperation({
    summary: 'Service performance — bookings, revenue, avg duration, RANK() window function (Admin only)',
  })
  servicePerformance(): Promise<object[]> {
    return this.reportService.servicePerformance();
  }

  // GET /reports/stylist-performance
  @Get('stylist-performance')
  @ApiOperation({
    summary: 'Stylist performance — hours worked, revenue, commission calculated in SQL (Admin only)',
  })
  stylistPerformance(): Promise<object[]> {
    return this.reportService.stylistPerformance();
  }

  // GET /reports/customer-analysis
  @Get('customer-analysis')
  @ApiOperation({
    summary: 'Customer visit analysis — tier (VIP/Regular/Occasional), favourite service, total spend (Admin only)',
  })
  customerVisitAnalysis(): Promise<object[]> {
    return this.reportService.customerVisitAnalysis();
  }
}
