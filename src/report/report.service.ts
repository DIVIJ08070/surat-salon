import { Injectable } from '@nestjs/common';
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

  // ─── 1. DAILY BUSINESS SUMMARY ───────────────────────────────────────────────
  // Completed appointments, revenue, no-shows, peak hour for a given date

  async dailySummary(date: string): Promise<any> {
    const [summary] = await this.db.query<any>(DAILY_SUMMARY, [date]);

    // Peak hour — the start_time that had the most appointments
    const peakRows: { peak_hour: string; count: string }[] = await this.db.query(PEAK_HOUR, [date]);

    return {
      date,
      ...summary,
      total_revenue: Number(summary.total_revenue),
      peak_hour: peakRows.length ? peakRows[0].peak_hour : null,
    };
  }

  // ─── 2. SERVICE PERFORMANCE REPORT ────────────────────────────────────────────
  // Bookings count, revenue, avg duration — ranked using RANK() window function

  async servicePerformance(): Promise<object[]> {
    return this.db.query(SERVICE_PERFORMANCE);
  }

  // ─── 3. STYLIST PERFORMANCE REPORT ────────────────────────────────────────────
  // Hours worked, appointments handled, revenue, commission calculated in SQL

  async stylistPerformance(): Promise<object[]> {
    return this.db.query(STYLIST_PERFORMANCE);
  }

  // ─── 4. CUSTOMER VISIT ANALYSIS ────────────────────────────────────────────────
  // Visit frequency, total spend, favourite service (via subquery), CASE WHEN tier

  async customerVisitAnalysis(): Promise<object[]> {
    return this.db.query(CUSTOMER_VISIT_ANALYSIS);
  }
}
