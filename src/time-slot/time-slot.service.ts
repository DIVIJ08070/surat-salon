import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { GenerateSlotsDto } from './dto/generate-slots.dto';
import { BulkGenerateSlotsDto } from './dto/bulk-generate-slots.dto';
import { ITimeSlot } from './interfaces/time-slot.interface';
import { SlotStatus } from 'src/common/enums';
import {
  FIND_STYLIST_SHIFT,
  FIND_APPROVED_LEAVES_IN_RANGE,
  CHECK_SLOT_EXISTS,
  INSERT_TIME_SLOT,
  FIND_ALL_TIME_SLOTS,
  FIND_TIME_SLOT_BY_ID,
  REMOVE_AVAILABLE_SLOTS_FOR_DATE,
  FIND_AVAILABLE_SLOTS,
} from './time-slot.query';
import { FIND_ALL_ACTIVE_STYLIST_IDS } from 'src/stylist/stylist.query';

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
    const created = await this.generateForStylist(
      dto.stylistId,
      dto.fromDate,
      dto.toDate,
      dto.slotDurationMinutes,
    );
    return { message: 'Time slots generated successfully', created };
  }

  async generateBulk(dto: BulkGenerateSlotsDto): Promise<{ message: string; created: number; stylistsProcessed: number }> {
    const fromDate = dto.fromDate ?? new Date().toISOString().slice(0, 10);
    const toDate = dto.toDate ?? addDays(fromDate, 30);
    const slotDuration = dto.slotDurationMinutes ?? 30;

    // Validate range once before the loop
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const daysDiff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff > 60) {
      throw new BadRequestException('Bulk date range cannot exceed 60 days. Please generate in smaller batches.');
    }
    if (fromDate > toDate) {
      throw new BadRequestException('fromDate must be before or equal to toDate');
    }

    const stylists = await this.db.query<{ id: number }>(FIND_ALL_ACTIVE_STYLIST_IDS);
    if (!stylists.length) {
      return { message: 'No active stylists found to generate slots for', created: 0, stylistsProcessed: 0 };
    }

    let totalCreated = 0;
    let failedStylists = 0;

    for (const stylist of stylists) {
      try {
        const created = await this.generateForStylist(stylist.id, fromDate, toDate, slotDuration, true);
        totalCreated += created;
      } catch (error: any) {
        failedStylists++;
        console.error(`Error generating slots for stylist ${stylist.id}:`, error.message);
      }
    }

    if (totalCreated === 0 && failedStylists === stylists.length) {
      throw new BadRequestException('Failed to generate slots for any stylists. Check server logs for details.');
    }

    return {
      message: `Successfully processed ${stylists.length} stylists.`,
      created: totalCreated,
      stylistsProcessed: stylists.length,
    };
  }

  private async generateForStylist(
    stylistId: number,
    fromDate: string,
    toDate: string,
    slotDurationMinutes?: number,
    isBulk = false,
  ): Promise<number> {
    const slotDuration = slotDurationMinutes ?? 30;

    if (slotDuration < 15 || slotDuration > 120)
      throw new BadRequestException('slotDurationMinutes must be between 15 and 120');
    if (fromDate > toDate)
      throw new BadRequestException('fromDate must be before or equal to toDate');

    const todayStr = new Date().toISOString().slice(0, 10);
    if (!isBulk && fromDate < todayStr)
      throw new BadRequestException(`Cannot generate slots for past dates. fromDate must be ${todayStr} or later.`);

    const from = new Date(fromDate);
    const to = new Date(toDate);
    const daysDiff = Math.floor((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 60) throw new BadRequestException('Date range cannot exceed 60 days');

    const stylistRows = await this.db.query<{ id: number; shift_start: string; shift_end: string; working_days: string }>(
      FIND_STYLIST_SHIFT,
      [stylistId],
    );
    if (!stylistRows.length) {
      if (isBulk) return 0;
      throw new NotFoundException(`Stylist with id ${stylistId} not found`);
    }

    const { shift_start, shift_end, working_days } = stylistRows[0];
    const shiftStartMin = timeToMinutes(shift_start);
    const shiftEndMin = timeToMinutes(shift_end);

    if (shiftEndMin <= shiftStartMin) {
      if (isBulk) return 0;
      throw new BadRequestException(`Stylist ${stylistId} shift_end must be after shift_start`);
    }

    const approvedLeaves = await this.db.query<{ leave_date: string }>(
      FIND_APPROVED_LEAVES_IN_RANGE,
      [stylistId, fromDate, toDate],
    );
    const leaveDates = new Set(approvedLeaves.map(r => r.leave_date));
    const workingDayNums = parseWorkingDays(working_days);

    let created = 0;
    for (const date of dateRange(fromDate, toDate)) {
      if (leaveDates.has(date)) continue;
      if (!workingDayNums.has(new Date(date).getUTCDay())) continue;

      let cursor = shiftStartMin;
      while (cursor + slotDuration <= shiftEndMin) {
        const startTime = minutesToTime(cursor);
        const endTime = minutesToTime(cursor + slotDuration);

        const existing = await this.db.query<{ id: number }>(CHECK_SLOT_EXISTS, [stylistId, date, startTime]);

        if (!existing.length) {
          await this.db.execute(INSERT_TIME_SLOT, [stylistId, date, startTime, endTime, SlotStatus.AVAILABLE]);
          created++;
        }
        cursor += slotDuration;
      }
    }
    return created;
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

    const countRows = await this.db.query<{ total: string }>(`SELECT COUNT(*) AS total FROM time_slots ts ${whereSql}`, params);
    const total = parseInt(countRows[0].total, 10);

    const data = await this.db.query<TimeSlotRow>(
      FIND_ALL_TIME_SLOTS(whereSql),
      [...params, limit, offset],
    );
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number): Promise<TimeSlotRow> {
    const rows = await this.db.query<TimeSlotRow>(FIND_TIME_SLOT_BY_ID, [id]);
    if (!rows.length) throw new NotFoundException(`Time slot with id ${id} not found`);
    return rows[0];
  }

  async removeForDate(stylistId: number, date: string): Promise<{ message: string; deleted: number }> {
    const result = await this.db.execute(REMOVE_AVAILABLE_SLOTS_FOR_DATE, [stylistId, date]);
    return { message: 'Available slots removed for the date', deleted: result.affectedRows ?? 0 };
  }

  async getAvailableSlots(stylistId: number, date: string): Promise<ITimeSlot[]> {
    return this.db.query<ITimeSlot>(FIND_AVAILABLE_SLOTS, [stylistId, date]);
  }
}
