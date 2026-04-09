import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryRunner, Repository } from 'typeorm';
import { Appointment } from 'src/entities';
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
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepository: Repository<Appointment>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── AUTO-GENERATE APPOINTMENT NUMBER (APT-YYYY-NNN) ─────────────────────────

  private async generateAppointmentNumber(qr: QueryRunner): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `APT-${year}-`;

    const rows: { appointment_number: string }[] = await qr.query(
      `SELECT appointment_number FROM appointments
       WHERE appointment_number LIKE ?
       ORDER BY id DESC LIMIT 1`,
      [`${prefix}%`],
    );

    let nextNum = 1;
    if (rows.length) {
      const last = rows[0].appointment_number; // e.g. APT-2026-007
      const parts = last.split('-');
      nextNum = parseInt(parts[parts.length - 1], 10) + 1;
    }

    return `${prefix}${nextNum.toString().padStart(3, '0')}`;
  }

  // ─── CREATE APPOINTMENT ──────────────────────────────────────────────────────

  async create(dto: CreateAppointmentDto): Promise<object> {
    // 1. Block past dates
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dto.appointmentDate < todayStr) {
      throw new BadRequestException('Cannot book appointments for past dates');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 2. Validate customer exists and is active
      const customerRows: { id: number }[] = await qr.query(
        `SELECT id FROM customers WHERE id = ? AND status = 1`,
        [dto.customerId],
      );
      if (!customerRows.length) {
        throw new NotFoundException(`Customer with id ${dto.customerId} not found`);
      }

      // 3. Validate stylist exists and is active (not soft-deleted)
      const stylistRows: { id: number }[] = await qr.query(
        `SELECT id FROM stylists WHERE id = ? AND status = 1`,
        [dto.stylistId],
      );
      if (!stylistRows.length) {
        throw new NotFoundException(`Stylist with id ${dto.stylistId} not found`);
      }

      // Check if stylist has an approved leave on the SPECIFIC booking date only
      // (stylist_status column is a global flag — not used here to avoid false blocks)
      const leaveRows: { id: number }[] = await qr.query(
        `SELECT id FROM stylist_leaves
         WHERE stylist_id = ? AND leave_date = ? AND leave_status = 'approved' AND status = 1`,
        [dto.stylistId, dto.appointmentDate],
      );
      if (leaveRows.length) {
        throw new UnprocessableEntityException(
          `Stylist is on approved leave on ${dto.appointmentDate}`,
        );
      }

      // 4. Validate all services exist, are active, and are offered by the stylist
      const placeholders = dto.serviceIds.map(() => '?').join(', ');

      const serviceRows: {
        id: number;
        name: string;
        price: number;
        duration_minutes: number;
        is_available: number;
      }[] = await qr.query(
        `SELECT s.id, s.name, s.price, s.duration_minutes, s.is_available
         FROM services s
         WHERE s.id IN (${placeholders}) AND s.status = 1`,
        dto.serviceIds,
      );

      if (serviceRows.length !== dto.serviceIds.length) {
        throw new BadRequestException('One or more service IDs are invalid or inactive');
      }
      if (serviceRows.some((s) => !s.is_available)) {
        throw new BadRequestException('One or more services are currently unavailable');
      }

      // Validate stylist can perform all requested services
      const stylistServiceRows: { service_id: number }[] = await qr.query(
        `SELECT service_id FROM stylist_services
         WHERE stylist_id = ? AND service_id IN (${placeholders}) AND status = 1`,
        [dto.stylistId, ...dto.serviceIds],
      );
      if (stylistServiceRows.length !== dto.serviceIds.length) {
        throw new UnprocessableEntityException(
          `Stylist cannot perform one or more of the requested services`,
        );
      }

      // 5. Calculate total duration and determine required slots
      const totalDuration = serviceRows.reduce((sum, s) => sum + s.duration_minutes, 0);
      const totalAmount = serviceRows.reduce((sum, s) => sum + Number(s.price), 0);
      const slotDuration = 30; // fixed slot size
      const slotsNeeded = Math.ceil(totalDuration / slotDuration);

      const startMin = timeToMinutes(dto.startTime);
      const endMin = startMin + slotsNeeded * slotDuration;
      const endTime = minutesToTime(endMin);

      // Build array of expected start times for each slot
      const expectedStartTimes: string[] = [];
      for (let i = 0; i < slotsNeeded; i++) {
        expectedStartTimes.push(minutesToTime(startMin + i * slotDuration));
      }

      // 6. Check all required slots are AVAILABLE — single atomic SELECT FOR UPDATE
      const slotPlaceholders = expectedStartTimes.map(() => '?').join(', ');
      const availableSlots: {
        id: number;
        start_time: string;
        slot_status: string;
      }[] = await qr.query(
        `SELECT id, start_time, slot_status
         FROM time_slots
         WHERE stylist_id = ? AND slot_date = ?
           AND start_time IN (${slotPlaceholders})
           AND slot_status = 'available' AND status = 1
         FOR UPDATE`,
        [dto.stylistId, dto.appointmentDate, ...expectedStartTimes],
      );

      if (availableSlots.length !== slotsNeeded) {
        throw new ConflictException(
          `One or more required time slots are not available for ${dto.appointmentDate} starting ${dto.startTime}`,
        );
      }

      const slotIds = availableSlots.map((s) => s.id);

      // 7. Generate appointment number
      const appointmentNumber = await this.generateAppointmentNumber(qr);

      // 8. INSERT appointment
      await qr.query(
        `INSERT INTO appointments
           (appointment_number, customer_id, stylist_id, appointment_date,
            start_time, end_time, total_duration_minutes, total_amount, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          appointmentNumber,
          dto.customerId,
          dto.stylistId,
          dto.appointmentDate,
          dto.startTime,
          endTime,
          totalDuration,
          totalAmount,
          dto.notes ?? null,
        ],
      );

      // Get the new appointment ID
      const newApt: { id: number }[] = await qr.query(
        `SELECT id FROM appointments WHERE appointment_number = ?`,
        [appointmentNumber],
      );
      const appointmentId = newApt[0].id;

      // 9. INSERT appointment_services rows (one per service)
      for (const svc of serviceRows) {
        await qr.query(
          `INSERT INTO appointment_services
             (appointment_id, service_id, price_at_booking, duration_minutes)
           VALUES (?, ?, ?, ?)`,
          [appointmentId, svc.id, svc.price, svc.duration_minutes],
        );
      }

      // 10. BLOCK all required time slots atomically
      const slotIdPlaceholders = slotIds.map(() => '?').join(', ');
      await qr.query(
        `UPDATE time_slots
         SET slot_status = ?, block_reason = ?, appointment_id = ?
         WHERE id IN (${slotIdPlaceholders})`,
        [SlotStatus.BOOKED, 'appointment', appointmentId, ...slotIds],
      );

      await qr.commitTransaction();

      // Return full appointment details
      return this.findOne(appointmentId, UserRole.ADMIN);
    } catch (err: unknown) {
      await qr.rollbackTransaction();

      // Catch DB-level UNIQUE constraint violation → 409 Conflict (race condition)
      if (
        typeof err === 'object' &&
        err !== null &&
        'code' in err &&
        (err as { code: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException('Appointment slot conflict — another booking was made simultaneously');
      }

      throw err;
    } finally {
      await qr.release();
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

    const countRows: { total: string }[] = await this.appointmentRepository.query(
      `SELECT COUNT(*) AS total FROM appointments a ${whereSql}`,
      params,
    );
    const total = parseInt(countRows[0].total, 10);

    const data: object[] = await this.appointmentRepository.query(
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

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── GET ONE APPOINTMENT (with services) ─────────────────────────────────────

  async findOne(id: number, _role?: UserRole): Promise<AppointmentDetail> {
    const rows: AppointmentRow[] = await this.appointmentRepository.query(
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

    if (!rows.length) {
      throw new NotFoundException(`Appointment with id ${id} not found`);
    }

    const services: AppointmentServiceRow[] = await this.appointmentRepository.query(
      `SELECT aps.id, s.name AS service_name, s.service_code,
              aps.price_at_booking, aps.duration_minutes, aps.appointment_service_status
       FROM appointment_services aps
       JOIN services s ON s.id = aps.service_id
       WHERE aps.appointment_id = ? AND aps.status = 1`,
      [id],
    );

    return { ...rows[0], services };
  }

  // ─── STYLIST DAILY SCHEDULE ──────────────────────────────────────────────────
  // Stylists can only see their own schedule

  async getDailySchedule(stylistId: number, date: string): Promise<object[]> {
    return this.appointmentRepository.query(
      `SELECT a.id, a.appointment_number, a.appointment_date, a.start_time, a.end_time,
              a.total_duration_minutes, a.total_amount, a.appointment_status,
              c.name AS customer_name, c.phone AS customer_phone,
              GROUP_CONCAT(s.name ORDER BY s.name SEPARATOR ', ') AS services
       FROM appointments a
       JOIN customers c ON c.id = a.customer_id
       JOIN appointment_services aps ON aps.appointment_id = a.id AND aps.status = 1
       JOIN services s ON s.id = aps.service_id
       WHERE a.stylist_id = ? AND a.appointment_date = ? AND a.status = 1
       GROUP BY a.id
       ORDER BY a.start_time ASC`,
      [stylistId, date],
    );
  }

  // ─── MARK SERVICE AS COMPLETED ───────────────────────────────────────────────

  async completeService(appointmentId: number, serviceId: number): Promise<{ message: string }> {
    await this.findOne(appointmentId); // 404 guard

    await this.appointmentRepository.query(
      `UPDATE appointment_services
       SET appointment_service_status = ?
       WHERE appointment_id = ? AND service_id = ? AND status = 1`,
      [AppointmentServiceStatus.COMPLETED, appointmentId, serviceId],
    );

    // Check if ALL services for this appointment are now completed
    const pendingRows: { cnt: string }[] = await this.appointmentRepository.query(
      `SELECT COUNT(*) AS cnt FROM appointment_services
       WHERE appointment_id = ? AND appointment_service_status = 'pending' AND status = 1`,
      [appointmentId],
    );

    if (parseInt(pendingRows[0].cnt, 10) === 0) {
      // All services done → mark appointment as COMPLETED and release slots
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();
      try {
        await qr.query(
          `UPDATE appointments SET appointment_status = ? WHERE id = ?`,
          [AppointmentStatus.COMPLETED, appointmentId],
        );

        await qr.query(
          `UPDATE time_slots
           SET slot_status = 'available', block_reason = NULL, appointment_id = NULL
           WHERE appointment_id = ? AND status = 1`,
          [appointmentId],
        );
        await qr.commitTransaction();
      } catch (err) {
        await qr.rollbackTransaction();
        throw err;
      } finally {
        await qr.release();
      }

      return { message: 'Service marked complete. All services done — appointment completed and slots released.' };
    }

    return { message: 'Service marked as completed' };
  }

  // ─── CANCEL APPOINTMENT ──────────────────────────────────────────────────────

  async cancel(id: number): Promise<{ message: string }> {
    const apt = await this.findOne(id);

    if (apt.appointment_status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed appointment');
    }
    if (apt.appointment_status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Appointment is already cancelled');
    }

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // Cancel appointment
      await qr.query(
        `UPDATE appointments SET appointment_status = ? WHERE id = ?`,
        [AppointmentStatus.CANCELLED, id],
      );

      // Release time slots (set back to available)
      await qr.query(
        `UPDATE time_slots
         SET slot_status = 'available', block_reason = NULL, appointment_id = NULL
         WHERE appointment_id = ? AND status = 1`,
        [id],
      );

      await qr.commitTransaction();
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }

    return { message: 'Appointment cancelled and time slots released' };
  }

  // ─── MARK AS NO-SHOW ─────────────────────────────────────────────────────────

  async markNoShow(id: number): Promise<{ message: string }> {
    const apt = await this.findOne(id);

    if (apt.appointment_status !== AppointmentStatus.SCHEDULED) {
      throw new BadRequestException('Only SCHEDULED appointments can be marked as no-show');
    }

    await this.appointmentRepository.query(
      `UPDATE appointments SET appointment_status = ? WHERE id = ?`,
      [AppointmentStatus.NO_SHOW, id],
    );

    return { message: 'Appointment marked as no-show' };
  }
}
