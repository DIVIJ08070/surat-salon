import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TimeSlot } from 'src/entities';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { SlotStatus } from 'src/common/enums';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Parse "HH:MM:SS" or "HH:MM" to total minutes since midnight */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Format total minutes since midnight → "HH:MM:SS" */
function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}:00`;
}

/** Add days to a YYYY-MM-DD date string, return YYYY-MM-DD */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Return array of all dates between fromDate and toDate (inclusive) */
function dateRange(from: string, to: string): string[] {
  const dates: string[] = [];
  let current = from;
  while (current <= to) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

/**
 * Normalise a single working-day token to a 0-6 day number (0=Sun … 6=Sat).
 * Handles: "Mon"/"Monday"/"mon"/"monday"/"0"–"6".
 * Returns -1 if the token is unrecognised.
 */
const DAY_NAME_TO_NUM: Record<string, number> = {
  sun: 0, sunday: 0,
  mon: 1, monday: 1,
  tue: 2, tuesday: 2,
  wed: 3, wednesday: 3,
  thu: 4, thursday: 4,
  fri: 5, friday: 5,
  sat: 6, saturday: 6,
};

function parseWorkingDays(workingDays: string | null | undefined): Set<number> {
  if (!workingDays || workingDays.trim() === '') {
    // No working_days configured — treat every day as a working day
    return new Set([0, 1, 2, 3, 4, 5, 6]);
  }

  const nums = new Set<number>();
  for (const token of workingDays.split(/[,\s]+/)) {
    const t = token.trim().toLowerCase();
    if (!t) continue;
    if (DAY_NAME_TO_NUM[t] !== undefined) {
      nums.add(DAY_NAME_TO_NUM[t]);
    } else {
      const n = parseInt(t, 10);
      if (!isNaN(n) && n >= 0 && n <= 6) nums.add(n);
    }
  }

  // If nothing was parseable, fall back to all days
  return nums.size > 0 ? nums : new Set([0, 1, 2, 3, 4, 5, 6]);
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class TimeSlotService {
  constructor(
    @InjectRepository(TimeSlot)
    private readonly slotRepository: Repository<TimeSlot>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── GENERATE SLOTS ─────────────────────────────────────────────────────────

  async generate(dto: GenerateSlotsDto): Promise<{ message: string; created: number }> {
    const slotDuration = dto.slotDurationMinutes ?? 30;

    if (slotDuration < 15 || slotDuration > 120) {
      throw new BadRequestException('slotDurationMinutes must be between 15 and 120');
    }
    if (dto.fromDate > dto.toDate) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    // ── Block past dates ────────────────────────────────────────────────────────
    // Get today's date in YYYY-MM-DD (UTC) for a consistent, timezone-safe comparison
    const todayStr = new Date().toISOString().slice(0, 10);
    if (dto.fromDate < todayStr) {
      throw new BadRequestException(
        `Cannot generate slots for past dates. fromDate must be ${todayStr} or later.`,
      );
    }

    // Validate date range (max 60 days)
    const from = new Date(dto.fromDate);
    const to = new Date(dto.toDate);
    const daysDiff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 60) {
      throw new BadRequestException('Date range cannot exceed 60 days');
    }

    // Fetch stylist shift & working days
    const stylistRows: {
      id: number;
      shift_start: string;
      shift_end: string;
      working_days: string;
    }[] = await this.dataSource.query(
      `SELECT id, shift_start, shift_end, working_days FROM stylists WHERE id = ? AND status = 1`,
      [dto.stylistId],
    );

    if (!stylistRows.length) {
      throw new NotFoundException(`Stylist with id ${dto.stylistId} not found`);
    }

    const { shift_start, shift_end, working_days } = stylistRows[0];
    const shiftStartMin = timeToMinutes(shift_start);
    const shiftEndMin = timeToMinutes(shift_end);

    if (shiftEndMin <= shiftStartMin) {
      throw new BadRequestException('Stylist shift_end must be after shift_start');
    }

    // Fetch dates where stylist has approved leave (skip those)
    const approvedLeaves: { leave_date: string }[] = await this.dataSource.query(
      `SELECT DATE_FORMAT(leave_date, '%Y-%m-%d') AS leave_date
       FROM stylist_leaves
       WHERE stylist_id = ? AND leave_status = 'approved' AND status = 1
         AND leave_date BETWEEN ? AND ?`,
      [dto.stylistId, dto.fromDate, dto.toDate],
    );
    const leaveDates = new Set(approvedLeaves.map((r) => r.leave_date));

    // Build working day set — normalised to 0-6 numbers, format-agnostic
    const workingDayNums = parseWorkingDays(working_days);

    let created = 0;
    const dates = dateRange(dto.fromDate, dto.toDate);

    for (const date of dates) {
      // Skip leave dates
      if (leaveDates.has(date)) continue;

      // Skip non-working days (0 = Sun … 6 = Sat)
      const dayOfWeek = new Date(date).getUTCDay();
      if (!workingDayNums.has(dayOfWeek)) continue;

      // Generate slots for the day
      let cursor = shiftStartMin;
      while (cursor + slotDuration <= shiftEndMin) {
        const startTime = minutesToTime(cursor);
        const endTime = minutesToTime(cursor + slotDuration);

        // Skip if slot already exists for that stylist/date/start_time
        const existing: { id: number }[] = await this.dataSource.query(
          `SELECT id FROM time_slots
           WHERE stylist_id = ? AND slot_date = ? AND start_time = ? AND status = 1`,
          [dto.stylistId, date, startTime],
        );

        if (!existing.length) {
          await this.slotRepository.query(
            `INSERT INTO time_slots (stylist_id, slot_date, start_time, end_time, slot_status)
             VALUES (?, ?, ?, ?, ?)`,
            [dto.stylistId, date, startTime, endTime, SlotStatus.AVAILABLE],
          );
          created++;
        }

        cursor += slotDuration;
      }
    }

    return {
      message: `Time slots generated successfully`,
      created,
    };
  }

  // ─── LIST SLOTS ─────────────────────────────────────────────────────────────

  async findAll(filters: {
    stylistId?: number;
    date?: string;
    slotStatus?: SlotStatus;
    page?: number;
    limit?: number;
  }): Promise<{
    data: object[];
    meta: { total: number; page: number; limit: number; totalPages: number };
  }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const offset = (page - 1) * limit;

    const params: (string | number)[] = [];
    let whereSql = `WHERE ts.status = 1`;

    if (filters.stylistId) {
      whereSql += ` AND ts.stylist_id = ?`;
      params.push(filters.stylistId);
    }
    if (filters.date) {
      whereSql += ` AND ts.slot_date = ?`;
      params.push(filters.date);
    }
    if (filters.slotStatus) {
      whereSql += ` AND ts.slot_status = ?`;
      params.push(filters.slotStatus);
    }

    const countRows: { total: string }[] = await this.slotRepository.query(
      `SELECT COUNT(*) AS total
       FROM time_slots ts
       ${whereSql}`,
      params,
    );
    const total = parseInt(countRows[0].total, 10);

    const data: object[] = await this.slotRepository.query(
      `SELECT ts.id, ts.stylist_id, s.name AS stylist_name,
              ts.slot_date, ts.start_time, ts.end_time,
              ts.slot_status, ts.block_reason, ts.appointment_id
       FROM time_slots ts
       JOIN stylists s ON s.id = ts.stylist_id
       ${whereSql}
       ORDER BY ts.slot_date ASC, ts.start_time ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── GET ONE ────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<object> {
    const rows: object[] = await this.slotRepository.query(
      `SELECT ts.id, ts.stylist_id, s.name AS stylist_name,
              ts.slot_date, ts.start_time, ts.end_time,
              ts.slot_status, ts.block_reason, ts.appointment_id
       FROM time_slots ts
       JOIN stylists s ON s.id = ts.stylist_id
       WHERE ts.id = ? AND ts.status = 1`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException(`Time slot with id ${id} not found`);
    }

    return rows[0];
  }

  // ─── DELETE SLOTS FOR A DATE (Admin cleanup) ────────────────────────────────

  async removeForDate(stylistId: number, date: string): Promise<{ message: string; deleted: number }> {
    // Only delete AVAILABLE slots — never touch booked ones
    const result: { affectedRows: number } = await this.dataSource.query(
      `UPDATE time_slots SET status = 0
       WHERE stylist_id = ? AND slot_date = ? AND slot_status = 'available' AND status = 1`,
      [stylistId, date],
    );

    return {
      message: 'Available slots removed for the date',
      deleted: result.affectedRows ?? 0,
    };
  }

  // ─── AVAILABLE SLOTS FOR A STYLIST ON A DATE (used by Appointments) ─────────

  async getAvailableSlots(stylistId: number, date: string): Promise<object[]> {
    return this.slotRepository.query(
      `SELECT id, start_time, end_time, slot_status
       FROM time_slots
       WHERE stylist_id = ? AND slot_date = ? AND slot_status = 'available' AND status = 1
       ORDER BY start_time ASC`,
      [stylistId, date],
    );
  }
}
