import { Injectable, InternalServerErrorException, HttpException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import {
  DAILY_SUMMARY,
  PEAK_HOUR,
  SERVICE_PERFORMANCE,
  STYLIST_PERFORMANCE,
  CUSTOMER_VISIT_ANALYSIS,
} from './report.query';

@Injectable()
export class ReportService {
  constructor(private readonly db: DatabaseService) {}

  // Daily business summary: appointments, revenue, no-shows, peak hour

  async dailySummary(date: string): Promise<any> {
    try {
      const [summary] = await this.db.query<any>(DAILY_SUMMARY, [date]);

      // Peak hour is the start_time with the most appointments
      const peakRows: { peak_hour: string; count: string }[] = await this.db.query(PEAK_HOUR, [date]);

      return {
        date,
        ...summary,
        total_revenue: Number(summary.total_revenue),
        peak_hour: peakRows.length ? peakRows[0].peak_hour : null,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Service performance report: bookings, revenue, avg duration

  async servicePerformance(): Promise<object[]> {
    try {
      return this.db.query(SERVICE_PERFORMANCE);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Stylist performance report: hours, appointments, revenue, commission

  async stylistPerformance(): Promise<object[]> {
    try {
      return this.db.query(STYLIST_PERFORMANCE);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Customer visit analysis: visit frequency, spend, favourite service, tier

  async customerVisitAnalysis(): Promise<object[]> {
    try {
      return this.db.query(CUSTOMER_VISIT_ANALYSIS);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
