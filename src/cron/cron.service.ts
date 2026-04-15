import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DatabaseService } from 'src/database/database.service';
import { TimeSlotService } from 'src/time-slot/time-slot.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly timeSlotService: TimeSlotService,
  ) {}

  // Check daily at midnight if we need to generate slots for next month
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'auto-generate-slots', timeZone: 'Asia/Kolkata' })
  async autoGenerateNextMonthSlots(): Promise<void> {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0-indexed

    // Last day of current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
    const dayOfMonth = today.getDate();
    const daysInMonth = lastDayOfMonth.getDate();
    const daysLeft = daysInMonth - dayOfMonth;

    // Start generating next month's slots in the last week of current month
    if (daysLeft <= 7) {
      const nextMonthStart = new Date(currentYear, currentMonth + 1, 1);
      const nextMonthEnd = new Date(currentYear, currentMonth + 2, 0);

      const fromDate = nextMonthStart.toISOString().slice(0, 10);
      const toDate = nextMonthEnd.toISOString().slice(0, 10);

      this.logger.log(`[CRON] Detected ${daysLeft} days left in the month. Generating slots for next month: ${fromDate} to ${toDate}...`);

      try {
        const result = await this.timeSlotService.generateBulk({
          fromDate,
          toDate,
          slotDurationMinutes: 30,
        });
        this.logger.log(`[CRON] Successfully generated ${result.created} slots for ${result.stylistsProcessed} stylists.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : '';
        this.logger.error(`[CRON] Bulk generation failed: ${message}`, stack);
      }
    } else {
      this.logger.log(`[CRON] Checked slot generation: ${daysLeft} days left in the month. No action needed.`);
    }
  }

  // Daily revenue summary at 11:30 PM
  @Cron('30 23 * * *', { name: 'daily-revenue-summary', timeZone: 'Asia/Kolkata' })
  async runDailyRevenueSummary(): Promise<void> {
    const todayStr = new Date().toISOString().slice(0, 10);
    this.logger.log(`[CRON] Running daily revenue summary for ${todayStr}...`);

    try {
      // Get today's appointment totals
      const [summary]: any[] = await this.db.query(
        `SELECT
           COUNT(CASE WHEN appointment_status = 'completed'  THEN 1 END) AS completed,
           COUNT(CASE WHEN appointment_status = 'no_show'    THEN 1 END) AS no_shows,
           COUNT(CASE WHEN appointment_status = 'cancelled'  THEN 1 END) AS cancellations,
           COALESCE(
             SUM(CASE WHEN appointment_status = 'completed' THEN total_amount END), 0
           )                                                              AS total_revenue
         FROM appointments
         WHERE appointment_date = ? AND status = 1`,
        [todayStr],
      );

      // Get top earning service
      const topServiceRows: any[] =
        await this.db.query(
          `SELECT s.name AS service_name, SUM(aps.price_at_booking) AS revenue
           FROM appointment_services aps
           JOIN appointments a ON a.id = aps.appointment_id
             AND a.appointment_date = ? AND a.appointment_status = 'completed' AND a.status = 1
           JOIN services s ON s.id = aps.service_id
           WHERE aps.status = 1
           GROUP BY s.id, s.name
           ORDER BY revenue DESC
           LIMIT 1`,
          [todayStr],
        );

      // Get top performing stylist
      const topStylistRows: any[] =
        await this.db.query(
          `SELECT st.name AS stylist_name, COUNT(a.id) AS appointments
           FROM appointments a
           JOIN stylists st ON st.id = a.stylist_id
           WHERE a.appointment_date = ? AND a.appointment_status = 'completed' AND a.status = 1
           GROUP BY st.id, st.name
           ORDER BY appointments DESC
           LIMIT 1`,
          [todayStr],
        );

      // Log report summary
      this.logger.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 DAILY REVENUE SUMMARY — ${todayStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Completed Appointments : ${summary.completed}
  🚫 No-Shows              : ${summary.no_shows}
  ❌ Cancellations         : ${summary.cancellations}
  💰 Total Revenue         : ₹${Number(summary.total_revenue).toFixed(2)}
  🏆 Top Service           : ${topServiceRows[0]?.service_name ?? 'N/A'} (₹${Number(topServiceRows[0]?.revenue ?? 0).toFixed(2)})
  🌟 Top Stylist           : ${topStylistRows[0]?.stylist_name ?? 'N/A'} (${topStylistRows[0]?.appointments ?? 0} appts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const stack = error instanceof Error ? error.stack : '';
      this.logger.error(
        `[CRON] Daily revenue summary failed for ${todayStr}`,
        stack,
      );
    }
  }
}
