import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ReportService {
  constructor(private readonly dataSource: DataSource) {}

  // ─── 1. DAILY BUSINESS SUMMARY ───────────────────────────────────────────────
  // Completed appointments, revenue, no-shows, peak hour for a given date

  async dailySummary(date: string): Promise<object> {
    const [summary] = await this.dataSource.query(
      `SELECT
         COUNT(CASE WHEN appointment_status = 'completed' THEN 1 END)  AS completed_appointments,
         COUNT(CASE WHEN appointment_status = 'no_show'   THEN 1 END)  AS no_shows,
         COUNT(CASE WHEN appointment_status = 'cancelled' THEN 1 END)  AS cancellations,
         COUNT(*)                                                        AS total_appointments,
         COALESCE(SUM(CASE WHEN appointment_status = 'completed' THEN total_amount END), 0) AS total_revenue
       FROM appointments
       WHERE appointment_date = ? AND status = 1`,
      [date],
    );

    // Peak hour — the start_time that had the most appointments
    const peakRows: { peak_hour: string; count: string }[] = await this.dataSource.query(
      `SELECT TIME_FORMAT(start_time, '%H:00') AS peak_hour, COUNT(*) AS count
       FROM appointments
       WHERE appointment_date = ? AND status = 1
       GROUP BY peak_hour
       ORDER BY count DESC
       LIMIT 1`,
      [date],
    );

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
    return this.dataSource.query(
      `SELECT
         s.id,
         s.service_code,
         s.name          AS service_name,
         s.category,
         COUNT(aps.id)   AS total_bookings,
         COALESCE(SUM(aps.price_at_booking), 0)              AS total_revenue,
         ROUND(AVG(aps.duration_minutes), 1)                 AS avg_duration_minutes,
         RANK() OVER (ORDER BY COUNT(aps.id) DESC)           AS booking_rank,
         RANK() OVER (ORDER BY SUM(aps.price_at_booking) DESC) AS revenue_rank
       FROM services s
       LEFT JOIN appointment_services aps ON aps.service_id = s.id AND aps.status = 1
       LEFT JOIN appointments a ON a.id = aps.appointment_id AND a.appointment_status = 'completed'
       WHERE s.status = 1
       GROUP BY s.id, s.service_code, s.name, s.category
       ORDER BY total_bookings DESC`,
    );
  }

  // ─── 3. STYLIST PERFORMANCE REPORT ────────────────────────────────────────────
  // Hours worked, appointments handled, revenue, commission calculated in SQL

  async stylistPerformance(): Promise<object[]> {
    return this.dataSource.query(
      `SELECT
         st.id,
         st.name                                                    AS stylist_name,
         st.specialisation,
         COUNT(DISTINCT a.id)                                       AS total_appointments,
         COUNT(CASE WHEN a.appointment_status = 'completed' THEN 1 END) AS completed_appointments,
         COUNT(CASE WHEN a.appointment_status = 'no_show'   THEN 1 END) AS no_shows,
         COALESCE(SUM(CASE WHEN a.appointment_status = 'completed'
                           THEN a.total_duration_minutes END), 0)  AS total_minutes_worked,
         ROUND(COALESCE(SUM(CASE WHEN a.appointment_status = 'completed'
                           THEN a.total_duration_minutes END), 0) / 60.0, 2) AS total_hours_worked,
         COALESCE(SUM(CASE WHEN a.appointment_status = 'completed'
                           THEN a.total_amount END), 0)            AS total_revenue_generated,
         ROUND(
           COALESCE(SUM(CASE WHEN a.appointment_status = 'completed'
                             THEN a.total_amount END), 0)
           * st.commission_rate / 100, 2
         )                                                          AS commission_earned
       FROM stylists st
       LEFT JOIN appointments a ON a.stylist_id = st.id AND a.status = 1
       WHERE st.status = 1
       GROUP BY st.id, st.name, st.specialisation, st.commission_rate
       ORDER BY total_revenue_generated DESC`,
    );
  }

  // ─── 4. CUSTOMER VISIT ANALYSIS ────────────────────────────────────────────────
  // Visit frequency, total spend, favourite service (via subquery), CASE WHEN tier

  async customerVisitAnalysis(): Promise<object[]> {
    return this.dataSource.query(
      `SELECT
         c.id,
         c.customer_code,
         c.name            AS customer_name,
         c.phone,
         COUNT(DISTINCT a.id)                                         AS total_visits,
         COALESCE(SUM(CASE WHEN a.appointment_status = 'completed'
                           THEN a.total_amount END), 0)              AS total_spend,
         CASE
           WHEN COUNT(DISTINCT a.id) >= 10 THEN 'VIP'
           WHEN COUNT(DISTINCT a.id) >= 5  THEN 'Regular'
           WHEN COUNT(DISTINCT a.id) >= 1  THEN 'Occasional'
           ELSE 'New'
         END                                                          AS customer_tier,
         (
           SELECT s.name
           FROM appointment_services aps2
           JOIN appointments a2 ON a2.id = aps2.appointment_id
             AND a2.customer_id = c.id
             AND a2.appointment_status = 'completed'
             AND a2.status = 1
           JOIN services s ON s.id = aps2.service_id
           WHERE aps2.status = 1
           GROUP BY s.id, s.name
           ORDER BY COUNT(*) DESC
           LIMIT 1
         )                                                            AS favourite_service
       FROM customers c
       LEFT JOIN appointments a ON a.customer_id = c.id AND a.status = 1
       WHERE c.status = 1
       GROUP BY c.id, c.customer_code, c.name, c.phone
       ORDER BY total_spend DESC`,
    );
  }
}
