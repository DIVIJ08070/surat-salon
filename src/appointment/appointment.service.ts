import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
  InternalServerErrorException,
  HttpException,
} from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { AppointmentStatus, AppointmentServiceStatus, SlotStatus, UserRole } from 'src/common/enums';
import {
  GENERATE_APPOINTMENT_NUMBER,
  CHECK_APPOINTMENT_CUSTOMER_EXISTS,
  CHECK_APPOINTMENT_STYLIST_EXISTS,
  CHECK_STYLIST_ON_LEAVE,
  FIND_SERVICES_FOR_BOOKING,
  CHECK_STYLIST_CAN_DO_SERVICES,
  FIND_AVAILABLE_SLOTS_FOR_BOOKING,
  INSERT_APPOINTMENT,
  FIND_APPOINTMENT_ID_BY_NUMBER,
  INSERT_APPOINTMENT_SERVICE,
  BLOCK_TIME_SLOTS,
  FIND_ALL_APPOINTMENTS,
  FIND_APPOINTMENT_BY_ID,
  FIND_APPOINTMENT_SERVICES,
  FIND_STYLIST_DAILY_SCHEDULE,
  COMPLETE_APPOINTMENT_SERVICE,
  COUNT_PENDING_APPOINTMENT_SERVICES,
  COMPLETE_APPOINTMENT,
  RELEASE_APPOINTMENT_SLOTS,
  CANCEL_APPOINTMENT,
  MARK_APPOINTMENT_NO_SHOW,
} from './appointment.query';

// Row interfaces
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
  customer_name: string;
  customer_code: string;
  customer_phone: string;
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

@Injectable()
export class AppointmentService {
  constructor(private readonly db: DatabaseService) { }

  // We use a simple sequential number per year like APT-2024-001
  private async generateAppointmentNumber(conn: import('mysql2/promise').PoolConnection): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const [rows] = await conn.execute(GENERATE_APPOINTMENT_NUMBER(year)) as [{ max_num: number | null }[], unknown];
      const maxNum = Number(rows[0]?.max_num ?? 0);
      return `APT-${year}-${String(maxNum + 1).padStart(3, '0')}`;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Create appointment
  async create(dto: CreateAppointmentDto): Promise<AppointmentDetail> {
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dto.appointmentDate < todayStr) {
      throw new BadRequestException('Cannot book appointments for past dates');
    }

    const conn = await this.db.getConnection();
    await conn.beginTransaction();

    try {
      const [customerRows] = await conn.execute(CHECK_APPOINTMENT_CUSTOMER_EXISTS, [dto.customerId]) as [{ id: number }[], unknown];
      if (!customerRows.length) throw new NotFoundException(`Customer with id ${dto.customerId} not found`);

      const [stylistRows] = await conn.execute(CHECK_APPOINTMENT_STYLIST_EXISTS, [dto.stylistId]) as [{ id: number }[], unknown];
      if (!stylistRows.length) throw new NotFoundException(`Stylist with id ${dto.stylistId} not found`);

      const [leaveRows] = await conn.execute(CHECK_STYLIST_ON_LEAVE, [dto.stylistId, dto.appointmentDate]) as [{ id: number }[], unknown];
      if (leaveRows.length) throw new UnprocessableEntityException(`Stylist is on approved leave on ${dto.appointmentDate}`);

      const placeholders = dto.serviceIds.map(() => '?').join(', ');
      const [serviceRows] = await conn.execute(
        FIND_SERVICES_FOR_BOOKING(placeholders),
        dto.serviceIds,
      ) as [{ id: number; name: string; price: number; duration_minutes: number; is_available: number }[], unknown];

      if (serviceRows.length !== dto.serviceIds.length) throw new BadRequestException('One or more service IDs are invalid or inactive');
      if (serviceRows.some(s => !s.is_available)) throw new BadRequestException('One or more services are currently unavailable');

      const [stylistServiceRows] = await conn.execute(
        CHECK_STYLIST_CAN_DO_SERVICES(placeholders),
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

      // Convert the total duration into a list of specific 30-minute time slots we need to block
      const expectedStartTimes: string[] = [];
      for (let i = 0; i < slotsNeeded; i++) expectedStartTimes.push(minutesToTime(startMin + i * slotDuration));

      const slotPlaceholders = expectedStartTimes.map(() => '?').join(', ');
      const [availableSlots] = await conn.execute(
        FIND_AVAILABLE_SLOTS_FOR_BOOKING(slotPlaceholders),
        [dto.stylistId, dto.appointmentDate, ...expectedStartTimes],
      ) as [{ id: number; start_time: string }[], unknown];

      if (availableSlots.length !== slotsNeeded) {
        throw new ConflictException(`One or more required time slots are not available for ${dto.appointmentDate} starting ${dto.startTime}`);
      }

      const slotIds = availableSlots.map(s => s.id);
      const appointmentNumber = await this.generateAppointmentNumber(conn);

      await conn.execute(INSERT_APPOINTMENT, [
        appointmentNumber,
        dto.customerId,
        dto.stylistId,
        dto.appointmentDate,
        dto.startTime,
        endTime,
        totalDuration,
        totalAmount,
        dto.notes ?? null,
      ]);

      const [newApt] = await conn.execute(FIND_APPOINTMENT_ID_BY_NUMBER, [appointmentNumber]) as [{ id: number }[], unknown];
      const appointmentId = newApt[0].id;

      // Link services to the appointment and block the specific time slots in the database
      for (const svc of serviceRows) {
        await conn.execute(INSERT_APPOINTMENT_SERVICE, [appointmentId, svc.id, svc.price, svc.duration_minutes]);
      }

      const slotIdPlaceholders = slotIds.map(() => '?').join(', ');
      await conn.execute(
        BLOCK_TIME_SLOTS(slotIdPlaceholders),
        [SlotStatus.BOOKED, 'appointment', appointmentId, ...slotIds],
      );

      await conn.commit();
      return this.findOne(appointmentId, UserRole.ADMIN);
    } catch (error) {
      await conn.rollback();
      if (error instanceof HttpException) throw error;
      if (typeof error === 'object' && error !== null && 'code' in error && (error as { code: string }).code === 'ER_DUP_ENTRY') {
        throw new ConflictException('Appointment slot conflict — another booking was made simultaneously');
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    } finally {
      conn.release();
    }
  }

  // List appointments
  async findAll(filters: {
    customerId?: number;
    stylistId?: number;
    appointmentStatus?: AppointmentStatus;
    date?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: object[]; meta: object }> {
    try {
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
        FIND_ALL_APPOINTMENTS(whereSql),
        [...params, limit, offset],
      );
      return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Get one appointment
  async findOne(id: number, _role?: UserRole): Promise<AppointmentDetail> {
    try {
      const rows = await this.db.query<AppointmentRow>(FIND_APPOINTMENT_BY_ID, [id]);
      if (!rows.length) throw new NotFoundException(`Appointment with id ${id} not found`);

      const services = await this.db.query<AppointmentServiceRow>(FIND_APPOINTMENT_SERVICES, [id]);
      return { ...rows[0], services };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Stylist daily schedule
  async getDailySchedule(stylistId: number, date: string): Promise<AppointmentDetail[]> {
    try {
      const appointments = await this.db.query<AppointmentRow>(FIND_STYLIST_DAILY_SCHEDULE, [stylistId, date]);
      
      const result: AppointmentDetail[] = [];
      for (const apt of appointments) {
        const services = await this.db.query<AppointmentServiceRow>(FIND_APPOINTMENT_SERVICES, [apt.id]);
        result.push({ ...apt, services });
      }
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Mark service as completed
  async completeService(appointmentId: number, appointmentServiceId: number): Promise<{ message: string }> {
    try {
      await this.findOne(appointmentId);
      await this.db.execute(COMPLETE_APPOINTMENT_SERVICE, [AppointmentServiceStatus.COMPLETED, appointmentServiceId]);
      
      // If this was the last pending service, we automatically complete the whole appointment
      const pendingRows = await this.db.query<{ cnt: string }>(COUNT_PENDING_APPOINTMENT_SERVICES, [appointmentId]);
      if (parseInt(pendingRows[0].cnt, 10) === 0) {
        const conn = await this.db.getConnection();
        await conn.beginTransaction();
        try {
          await conn.execute(COMPLETE_APPOINTMENT, [AppointmentStatus.COMPLETED, appointmentId]);
          await conn.execute(RELEASE_APPOINTMENT_SLOTS, [appointmentId]);
          await conn.commit();
        } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
        return { message: 'Service marked complete. All services done — appointment completed and slots released.' };
      }
      return { message: 'Service marked as completed' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Cancel appointment
  async cancel(id: number): Promise<{ message: string }> {
    try {
      const apt = await this.findOne(id);
      if (apt.appointment_status === AppointmentStatus.COMPLETED) throw new BadRequestException('Cannot cancel a completed appointment');
      if (apt.appointment_status === AppointmentStatus.CANCELLED) throw new BadRequestException('Appointment is already cancelled');

      const conn = await this.db.getConnection();
      await conn.beginTransaction();
      try {
        await conn.execute(CANCEL_APPOINTMENT, [AppointmentStatus.CANCELLED, id]);
        await conn.execute(RELEASE_APPOINTMENT_SLOTS, [id]);
        await conn.commit();
      } catch (err) { await conn.rollback(); throw err; } finally { conn.release(); }
      return { message: 'Appointment cancelled and time slots released' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Mark as no-show
  async markNoShow(id: number): Promise<{ message: string }> {
    try {
      const apt = await this.findOne(id);
      if (apt.appointment_status !== AppointmentStatus.SCHEDULED) throw new BadRequestException('Only SCHEDULED appointments can be marked as no-show');
      await this.db.execute(MARK_APPOINTMENT_NO_SHOW, [AppointmentStatus.NO_SHOW, id]);
      return { message: 'Appointment marked as no-show' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
