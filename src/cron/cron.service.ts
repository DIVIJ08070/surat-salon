import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);

  constructor(private readonly db: DatabaseService) {}

  // ─── DAILY REVENUE SUMMARY — runs every day at 11:30 PM ──────────────────────
  @Cron('30 23 * * *', { name: 'daily-revenue-summary', timeZone: 'Asia/Kolkata' })
  async runDailyRevenueSummary(): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    this.logger.log(`[CRON] Running daily revenue summary for ${today}...`);

    try {
      // Totals for today
      const [summary]: {
        completed: string;
        no_shows: string;
        cancellations: string;
        total_revenue: string;
      }[] = await this.db.query(
        `SELECT
           COUNT(CASE WHEN appointment_status = 'completed'  THEN 1 END) AS completed,
           COUNT(CASE WHEN appointment_status = 'no_show'    THEN 1 END) AS no_shows,
           COUNT(CASE WHEN appointment_status = 'cancelled'  THEN 1 END) AS cancellations,
           COALESCE(
             SUM(CASE WHEN appointment_status = 'completed' THEN total_amount END), 0
           )                                                              AS total_revenue
         FROM appointments
         WHERE appointment_date = ? AND status = 1`,
        [today],
      );

      // Top earning service of the day
      const topServiceRows: { service_name: string; revenue: string }[] =
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
          [today],
        );

      // Top performing stylist of the day
      const topStylistRows: { stylist_name: string; appointments: string }[] =
        await this.db.query(
          `SELECT st.name AS stylist_name, COUNT(a.id) AS appointments
           FROM appointments a
           JOIN stylists st ON st.id = a.stylist_id
           WHERE a.appointment_date = ? AND a.appointment_status = 'completed' AND a.status = 1
           GROUP BY st.id, st.name
           ORDER BY appointments DESC
           LIMIT 1`,
          [today],
        );

      // Log the summary
      this.logger.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  📊 DAILY REVENUE SUMMARY — ${today}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ✅ Completed Appointments : ${summary.completed}
  🚫 No-Shows              : ${summary.no_shows}
  ❌ Cancellations         : ${summary.cancellations}
  💰 Total Revenue         : ₹${Number(summary.total_revenue).toFixed(2)}
  🏆 Top Service           : ${topServiceRows[0]?.service_name ?? 'N/A'} (₹${Number(topServiceRows[0]?.revenue ?? 0).toFixed(2)})
  🌟 Top Stylist           : ${topStylistRows[0]?.stylist_name ?? 'N/A'} (${topStylistRows[0]?.appointments ?? 0} appts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    } catch (err: unknown) {
      this.logger.error(
        `[CRON] Daily revenue summary failed for ${today}`,
        err instanceof Error ? err.stack : String(err),
      );
    }
  }
}
