import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus, AppointmentServiceStatus, SlotStatus, UserRole } from 'src/common/enums';

// ─── Typed row interfaces ────────────────────────────────────────────────────

interface AppointmentServiceRow {
  id: number;
  service_name: string;
  service_code: string;
  price_at_booking: number;
  duration_minutes: number;
  appointment_service_status: AppointmentServiceStatus;
}

interface AppointmentRow {
  id: number;
  appointment_number: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  total_duration_minutes: number;
  total_amount: number;
  appointment_status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer_id: number;
  customer_name: string;
  customer_code: string;
  customer_phone: string;
  stylist_id: number;
  stylist_name: string;
}

interface AppointmentDetail extends AppointmentRow {
  services: AppointmentServiceRow[];
}

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}:00`;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class AppointmentService {
  constructor(private readonly db: DatabaseService) { }

  // ─── AUTO-GENERATE APPOINTMENT NUMBER (APT-YYYY-NNN) ─────────────────────────

  private async generateAppointmentNumber(conn: import('mysql2/promise').PoolConnection): Promise<string> {
    const year = new Date().getFullYear();
    const [rows] = await conn.execute(
      `SELECT MAX(CAST(SUBSTRING_INDEX(appointment_number, '-', -1) AS UNSIGNED)) AS max_num
       FROM appointments WHERE appointment_number REGEXP '^APT-${year}-[0-9]+$'`,
    ) as [{ max_num: number | null }[], unknown];
    const maxNum = Number(rows[0]?.max_num ?? 0);
    return `APT-${year}-${String(maxNum + 1).padStart(3, '0')}`;
  }

  // ─── CREATE APPOINTMENT ──────────────────────────────────────────────────────

  async create(dto: CreateAppointmentDto): Promise<AppointmentDetail> {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dto.appointmentDate < todayStr) {
      throw new BadRequestException('Cannot book appointments for past dates');
    }

    const conn = await this.db.getConnection();
    await conn.beginTransaction();

    try {
      const [customerRows] = await conn.execute(
        `SELECT id FROM customers WHERE id = ? AND status = 1`, [dto.customerId],
      ) as [{ id: number }[], unknown];
      if (!customerRows.length) throw new NotFoundException(`Customer with id ${dto.customerId} not found`);

      const [stylistRows] = await conn.execute(
        `SELECT id FROM stylists WHERE id = ? AND status = 1`, [dto.stylistId],
      ) as [{ id: number }[], unknown];
      if (!stylistRows.length) throw new NotFoundException(`Stylist with id ${dto.stylistId} not found`);

      const [leaveRows] = await conn.execute(
        `SELECT id FROM stylist_leaves WHERE stylist_id = ? AND leave_date = ? AND leave_status = 'approved' AND status = 1`,
        [dto.stylistId, dto.appointmentDate],
      ) as [{ id: number }[], unknown];
      if (leaveRows.length) throw new UnprocessableEntityException(`Stylist is on approved leave on ${dto.appointmentDate}`);

      const placeholders = dto.serviceIds.map(() => '?').join(', ');
      const [serviceRows] = await conn.execute(
        `SELECT s.id, s.name, s.price, s.duration_minutes, s.is_available FROM services s WHERE s.id IN (${placeholders}) AND s.status = 1`,
        dto.serviceIds,
      ) as [{ id: number; name: string; price: number; duration_minutes: number; is_available: number }[], unknown];

      if (serviceRows.length !== dto.serviceIds.length) throw new BadRequestException('One or more service IDs are invalid or inactive');
      if (serviceRows.some(s => !s.is_available)) throw new BadRequestException('One or more services are currently unavailable');

      const [stylistServiceRows] = await conn.execute(
        `SELECT service_id FROM stylist_services WHERE stylist_id = ? AND service_id IN (${placeholders}) AND status = 1`,
        [dto.stylistId, ...dto.serviceIds],
      ) as [{ service_id: number }[], unknown];
      if (stylistServiceRows.length !== dto.serviceIds.length) {
        throw new UnprocessableEntityException('Stylist cannot perform one or more of the requested services');
      }

      const totalDuration = serviceRows.reduce((sum, s) => sum + s.duration_minutes, 0);
      const totalAmount = serviceRows.reduce((sum, s) => sum + Number(s.price), 0);
      const slotDuration = 30;
      const slotsNeeded = Math.ceil(totalDuration / slotDuration);
      const startMin = timeToMinutes(dto.startTime);
      const endTime = minutesToTime(startMin + slotsNeeded * slotDuration);

      const expectedStartTimes: string[] = [];
      for (let i = 0; i < slotsNeeded; i++) expectedStartTimes.push(minutesToTime(startMin + i * slotDuration));

      const slotPlaceholders = expectedStartTimes.map(() => '?').join(', ');
      const [availableSlots] = await conn.execute(
        `SELECT id, start_time, slot_status FROM time_slots
         WHERE stylist_id = ? AND slot_date = ? AND start_time IN (${slotPlaceholders})
           AND slot_status = 'available' AND status = 1 FOR UPDATE`,
        [dto.stylistId, dto.appointmentDate, ...expectedStartTimes],
      ) as [{ id: number; start_time: string }[], unknown];

      if (availableSlots.length !== slotsNeeded) {
        throw new ConflictException(`One or more required time slots are not available for ${dto.appointmentDate} starting ${dto.startTime}`);
      }

      const slotIds = availableSlots.map(s => s.id);
      const appointmentNumber = await this.generateAppointmentNumber(conn);

      await conn.execute(
        `INSERT INTO appointments (appointment_number, customer_id, stylist_id, appointment_date, start_time, end_time, total_duration_minutes, total_amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [appointmentNumber, dto.customerId, dto.stylistId, dto.appointmentDate, dto.startTime, endTime, totalDuration, totalAmount, dto.notes ?? null],
      );

      const [newApt] = await conn.execute(
        `SELECT id FROM appointments WHERE appointment_number = ?`, [appointmentNumber],
      ) as [{ id: number }[], unknown];
      const appointmentId = newApt[0].id;

      for (const svc of serviceRows) {
        await conn.execute(
          `INSERT INTO appointment_services (appointment_id, service_id, price_at_booking, duration_minutes) VALUES (?, ?, ?, ?)`,
          [appointmentId, svc.id, svc.price, svc.duration_minutes],
        );
      }

      const slotIdPlaceholders = slotIds.map(() => '?').join(', ');
      await conn.execute(
        `UPDATE time_slots SET slot_status = ?, block_reason = ?, appointment_id = ? WHERE id IN (${slotIdPlaceholders})`,
        [SlotStatus.BOOKED, 'appointment', appointmentId, ...slotIds],
      );

      await conn.commit();
      return this.findOne(appointmentId, UserRole.ADMIN);
    } catch (err: unknown) {
      await conn.rollback();
      if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Appointment slot conflict — another booking was made simultaneously');
      }
      throw err;
    } finally {
      conn.release();
    }
  }

  // ─── LIST APPOINTMENTS ───────────────────────────────────────────────────────

  async findAll(filters: {
    customerId?: number;
    stylistId?: number;
    appointmentStatus?: AppointmentStatus;
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: object[]; meta: object }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const offset = (page - 1) * limit;

    const params: (string | number)[] = [];
    let whereSql = `WHERE a.status = 1`;

    if (filters.customerId) {
      whereSql += ` AND a.customer_id = ?`;
      params.push(filters.customerId);
    }
    if (filters.stylistId) {
      whereSql += ` AND a.stylist_id = ?`;
      params.push(filters.stylistId);
    }
    if (filters.appointmentStatus) {
      whereSql += ` AND a.appointment_status = ?`;
      params.push(filters.appointmentStatus);
    }
    if (filters.date) {
      whereSql += ` AND a.appointment_date = ?`;
      params.push(filters.date);
    }

    const countRows = await this.db.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM appointments a ${whereSql}`, params,
    );
    const total = parseInt(countRows[0].total, 10);

    const data = await this.db.query<AppointmentRow>(
      `SELECT a.id, a.appointment_number, a.appointment_date, a.start_time, a.end_time,
              a.total_duration_minutes, a.total_amount, a.appointment_status, a.notes,
              a.created_at,
              c.id AS customer_id, c.name AS customer_name, c.customer_code, c.phone AS customer_phone,
              st.id AS stylist_id, st.name AS stylist_name
       FROM appointments a
       JOIN customers c ON c.id = a.customer_id
       JOIN stylists st ON st.id = a.stylist_id
       ${whereSql}
       ORDER BY a.appointment_date DESC, a.start_time DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  // ─── GET ONE APPOINTMENT (with services) ─────────────────────────────────────

  async findOne(id: number, _role?: UserRole): Promise<AppointmentDetail> {
    const rows = await this.db.query<AppointmentRow>(
      `SELECT a.id, a.appointment_number, a.appointment_date, a.start_time, a.end_time,
              a.total_duration_minutes, a.total_amount, a.appointment_status, a.notes,
              a.created_at, a.updated_at,
              c.id AS customer_id, c.name AS customer_name, c.customer_code, c.phone AS customer_phone,
              st.id AS stylist_id, st.name AS stylist_name
       FROM appointments a
       JOIN customers c ON c.id = a.customer_id
       JOIN stylists st ON st.id = a.stylist_id
       WHERE a.id = ? AND a.status = 1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException(`Appointment with id ${id} not found`);

    const services = await this.db.query<AppointmentServiceRow>(
      `SELECT aps.id, s.name AS service_name, s.service_code,
              aps.price_at_booking, aps.duration_minutes, aps.appointment_service_status
       FROM appointment_services aps JOIN services s ON s.id = aps.service_id
       WHERE aps.appointment_id = ? AND aps.status = 1`,
      [id],
    );
    return { ...rows[0], services };
  }

  // ─── STYLIST DAILY SCHEDULE ──────────────────────────────────────────────────
  // Stylists can only see their own schedule

  async getDailySchedule(stylistId: number, date: string): Promise<AppointmentRow[]> {
    return this.db.query<AppointmentRow>(
      `SELECT a.id, a.appointment_number, a.appointment_date, a.start_time, a.end_time,
              a.total_duration_minutes, a.total_amount, a.appointment_status,
              c.name AS customer_name, c.phone AS customer_phone,
              GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') AS services
       FROM appointments a
       JOIN customers c ON c.id = a.customer_id
       JOIN appointment_services aps ON aps.appointment_id = a.id AND aps.status = 1
       JOIN services s ON s.id = aps.service_id
       WHERE a.stylist_id = ? AND a.appointment_date = ? AND a.status = 1
       GROUP BY a.id ORDER BY a.start_time ASC`,
      [stylistId, date],
    );
  }

  // ─── MARK SERVICE AS COMPLETED ───────────────────────────────────────────────

  async completeService(appointmentId: number, serviceId: number): Promise<{ message: string }> {
    await this.findOne(appointmentId);
    await this.db.execute(
      `UPDATE appointment_services SET appointment_service_status = ? WHERE appointment_id = ? AND service_id = ? AND status = 1`,
      [AppointmentServiceStatus.COMPLETED, appointmentId, serviceId],
    );
    const pendingRows = await this.db.query<{ cnt: string }>(
      `SELECT COUNT(*) AS cnt FROM appointment_services WHERE appointment_id = ? AND appointment_service_status = 'pending' AND status = 1`,
      [appointmentId],
    );
    if (parseInt(pendingRows[0].cnt, 10) === 0) {
      const conn = await this.db.getConnection();
      await conn.beginTransaction();
      try {
        await conn.execute(`UPDATE appointments SET appointment_status = ? WHERE id = ?`, [AppointmentStatus.COMPLETED, appointmentId]);
        await conn.execute(`UPDATE time_slots SET slot_status = 'available', block_reason = NULL, appointment_id = NULL WHERE appointment_id = ? AND status = 1`, [appointmentId]);
        await conn.commit();
      } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
      return { message: 'Service marked complete. All services done — appointment completed and slots released.' };
    }
    return { message: 'Service marked as completed' };
  }

  // ─── CANCEL APPOINTMENT ──────────────────────────────────────────────────────

  async cancel(id: number): Promise<{ message: string }> {
    const apt = await this.findOne(id);
    if (apt.appointment_status === AppointmentStatus.COMPLETED) throw new BadRequestException('Cannot cancel a completed appointment');
    if (apt.appointment_status === AppointmentStatus.CANCELLED) throw new BadRequestException('Appointment is already cancelled');

    const conn = await this.db.getConnection();
    await conn.beginTransaction();
    try {
      await conn.execute(`UPDATE appointments SET appointment_status = ? WHERE id = ?`, [AppointmentStatus.CANCELLED, id]);
      await conn.execute(`UPDATE time_slots SET slot_status = 'available', block_reason = NULL, appointment_id = NULL WHERE appointment_id = ? AND status = 1`, [id]);
      await conn.commit();
    } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
    return { message: 'Appointment cancelled and time slots released' };
  }

  // ─── MARK AS NO-SHOW ─────────────────────────────────────────────────────────

  async markNoShow(id: number): Promise<{ message: string }> {
    const apt = await this.findOne(id);
    if (apt.appointment_status !== AppointmentStatus.SCHEDULED) throw new BadRequestException('Only SCHEDULED appointments can be marked as no-show');
    await this.db.execute(`UPDATE appointments SET appointment_status = ? WHERE id = ?`, [AppointmentStatus.NO_SHOW, id]);
    return { message: 'Appointment marked as no-show' };
  }
}
