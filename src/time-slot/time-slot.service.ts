import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { ITimeSlot } from './interfaces/time-slot.interface';
import { SlotStatus } from 'src/common/enums';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}:00`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  let current = from;
  while (current <= to) { dates.push(current); current = addDays(current, 1); }
  return dates;
}

const DAY_NAME_TO_NUM: Record<string, number> = {
  sun: 0, sunday: 0, mon: 1, monday: 1, tue: 2, tuesday: 2,
  wed: 3, wednesday: 3, thu: 4, thursday: 4, fri: 5, friday: 5, sat: 6, saturday: 6,
};

function parseWorkingDays(workingDays: string | null | undefined): Set<number> {
  if (!workingDays?.trim()) return new Set([0, 1, 2, 3, 4, 5, 6]);
  const nums = new Set<number>();
  for (const token of workingDays.split(/[,\s]+/)) {
    const t = token.trim().toLowerCase();
    if (!t) continue;
    if (DAY_NAME_TO_NUM[t] !== undefined) nums.add(DAY_NAME_TO_NUM[t]);
    else { const n = parseInt(t, 10); if (!isNaN(n) && n >= 0 && n <= 6) nums.add(n); }
  }
  return nums.size > 0 ? nums : new Set([0, 1, 2, 3, 4, 5, 6]);
}

// ─── TimeSlot row returned by findAll / findOne ────────────────────────────────

interface TimeSlotRow {
  id: number;
  stylist_id: number;
  stylist_name: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  slot_status: SlotStatus;
  block_reason: string | null;
  appointment_id: number | null;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class TimeSlotService {
  constructor(private readonly db: DatabaseService) {}

  async generate(dto: GenerateSlotsDto): Promise<{ message: string; created: number }> {
    const slotDuration = dto.slotDurationMinutes ?? 30;

    if (slotDuration < 15 || slotDuration > 120)
      throw new BadRequestException('slotDurationMinutes must be between 15 and 120');
    if (dto.fromDate > dto.toDate)
      throw new BadRequestException('fromDate must be before or equal to toDate');

    const todayStr = new Date().toISOString().slice(0, 10);
    if (dto.fromDate < todayStr)
      throw new BadRequestException(`Cannot generate slots for past dates. fromDate must be ${todayStr} or later.`);

    const from = new Date(dto.fromDate);
    const to = new Date(dto.toDate);
    const daysDiff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 60) throw new BadRequestException('Date range cannot exceed 60 days');

    const stylistRows = await this.db.query<{ id: number; shift_start: string; shift_end: string; working_days: string }>(
      `SELECT id, shift_start, shift_end, working_days FROM stylists WHERE id = ? AND status = 1`,
      [dto.stylistId],
    );
    if (!stylistRows.length) throw new NotFoundException(`Stylist with id ${dto.stylistId} not found`);

    const { shift_start, shift_end, working_days } = stylistRows[0];
    const shiftStartMin = timeToMinutes(shift_start);
    const shiftEndMin = timeToMinutes(shift_end);

    if (shiftEndMin <= shiftStartMin) throw new BadRequestException('Stylist shift_end must be after shift_start');

    const approvedLeaves = await this.db.query<{ leave_date: string }>(
      `SELECT DATE_FORMAT(leave_date, '%Y-%m-%d') AS leave_date FROM stylist_leaves
       WHERE stylist_id = ? AND leave_status = 'approved' AND status = 1 AND leave_date BETWEEN ? AND ?`,
      [dto.stylistId, dto.fromDate, dto.toDate],
    );
    const leaveDates = new Set(approvedLeaves.map(r => r.leave_date));
    const workingDayNums = parseWorkingDays(working_days);

    let created = 0;
    for (const date of dateRange(dto.fromDate, dto.toDate)) {
      if (leaveDates.has(date)) continue;
      if (!workingDayNums.has(new Date(date).getUTCDay())) continue;

      let cursor = shiftStartMin;
      while (cursor + slotDuration <= shiftEndMin) {
        const startTime = minutesToTime(cursor);
        const endTime = minutesToTime(cursor + slotDuration);

        const existing = await this.db.query<{ id: number }>(
          `SELECT id FROM time_slots WHERE stylist_id = ? AND slot_date = ? AND start_time = ? AND status = 1`,
          [dto.stylistId, date, startTime],
        );

        if (!existing.length) {
          await this.db.execute(
            `INSERT INTO time_slots (stylist_id, slot_date, start_time, end_time, slot_status) VALUES (?, ?, ?, ?, ?)`,
            [dto.stylistId, date, startTime, endTime, SlotStatus.AVAILABLE],
          );
          created++;
        }
        cursor += slotDuration;
      }
    }
    return { message: 'Time slots generated successfully', created };
  }

  async findAll(filters: {
    stylistId?: number;
    date?: string;
    slotStatus?: SlotStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: TimeSlotRow[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const offset = (page - 1) * limit;
    const params: (string | number)[] = [];
    let whereSql = `WHERE ts.status = 1`;

    if (filters.stylistId) { whereSql += ` AND ts.stylist_id = ?`; params.push(filters.stylistId); }
    if (filters.date)      { whereSql += ` AND ts.slot_date = ?`;  params.push(filters.date); }
    if (filters.slotStatus){ whereSql += ` AND ts.slot_status = ?`;params.push(filters.slotStatus); }

    const countRows = await this.db.query<{ total: string }>(
      `SELECT COUNT(*) AS total FROM time_slots ts ${whereSql}`, params,
    );
    const total = parseInt(countRows[0].total, 10);

    const data = await this.db.query<TimeSlotRow>(
      `SELECT ts.id, ts.stylist_id, s.name AS stylist_name,
              ts.slot_date, ts.start_time, ts.end_time, ts.slot_status, ts.block_reason, ts.appointment_id
       FROM time_slots ts JOIN stylists s ON s.id = ts.stylist_id
       ${whereSql} ORDER BY ts.slot_date ASC, ts.start_time ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number): Promise<TimeSlotRow> {
    const rows = await this.db.query<TimeSlotRow>(
      `SELECT ts.id, ts.stylist_id, s.name AS stylist_name,
              ts.slot_date, ts.start_time, ts.end_time, ts.slot_status, ts.block_reason, ts.appointment_id
       FROM time_slots ts JOIN stylists s ON s.id = ts.stylist_id
       WHERE ts.id = ? AND ts.status = 1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException(`Time slot with id ${id} not found`);
    return rows[0];
  }

  async removeForDate(stylistId: number, date: string): Promise<{ message: string; deleted: number }> {
    const result = await this.db.execute(
      `UPDATE time_slots SET status = 0 WHERE stylist_id = ? AND slot_date = ? AND slot_status = 'available' AND status = 1`,
      [stylistId, date],
    );
    return { message: 'Available slots removed for the date', deleted: result.affectedRows ?? 0 };
  }

  async getAvailableSlots(stylistId: number, date: string): Promise<ITimeSlot[]> {
    return this.db.query<ITimeSlot>(
      `SELECT id, start_time, end_time, slot_status FROM time_slots
       WHERE stylist_id = ? AND slot_date = ? AND slot_status = 'available' AND status = 1
       ORDER BY start_time ASC`,
      [stylistId, date],
    );
  }
}
