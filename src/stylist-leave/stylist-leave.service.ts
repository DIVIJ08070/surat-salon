import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveStatus, SlotStatus, BlockReason } from 'src/common/enums';

interface LeaveRow {
  id: number;
  stylist_id: number;
  leave_date: string;
  leave_start: string | null;
  leave_end: string | null;
  leave_status: LeaveStatus;
  reason: string | null;
  stylist_name: string;
  status: number;
}

@Injectable()
export class StylistLeaveService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateLeaveDto): Promise<LeaveRow> {
    const stylistRows = await this.db.query<{ id: number }>(
      `SELECT id FROM stylists WHERE id = ? AND status = 1`, [dto.stylistId],
    );
    if (!stylistRows.length) throw new NotFoundException(`Stylist with id ${dto.stylistId} not found`);

    const duplicate = await this.db.query<{ id: number }>(
      `SELECT id FROM stylist_leaves WHERE stylist_id = ? AND leave_date = ? AND leave_status IN ('pending', 'approved') AND status = 1`,
      [dto.stylistId, dto.leaveDate],
    );
    if (duplicate.length) throw new BadRequestException(`Leave already exists for stylist on ${dto.leaveDate}`);

    await this.db.execute(
      `INSERT INTO stylist_leaves (stylist_id, leave_date, leave_start, leave_end, reason) VALUES (?, ?, ?, ?, ?)`,
      [dto.stylistId, dto.leaveDate, dto.leaveStart ?? null, dto.leaveEnd ?? null, dto.reason ?? null],
    );

    const rows = await this.db.query<LeaveRow>(
      `SELECT sl.*, s.name AS stylist_name FROM stylist_leaves sl JOIN stylists s ON s.id = sl.stylist_id ORDER BY sl.id DESC LIMIT 1`,
    );
    return rows[0];
  }

  async findAll(stylistId?: number): Promise<LeaveRow[]> {
    if (stylistId) {
      return this.db.query<LeaveRow>(
        `SELECT sl.*, s.name AS stylist_name FROM stylist_leaves sl JOIN stylists s ON s.id = sl.stylist_id WHERE sl.stylist_id = ? AND sl.status = 1 ORDER BY sl.leave_date DESC`,
        [stylistId],
      );
    }
    return this.db.query<LeaveRow>(
      `SELECT sl.*, s.name AS stylist_name FROM stylist_leaves sl JOIN stylists s ON s.id = sl.stylist_id WHERE sl.status = 1 ORDER BY sl.leave_date DESC`,
    );
  }

  async findOne(id: number): Promise<LeaveRow> {
    const rows = await this.db.query<LeaveRow>(
      `SELECT sl.*, s.name AS stylist_name FROM stylist_leaves sl JOIN stylists s ON s.id = sl.stylist_id WHERE sl.id = ? AND sl.status = 1`,
      [id],
    );
    if (!rows.length) throw new NotFoundException(`Leave request with id ${id} not found`);
    return rows[0];
  }

  async approve(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id);
    if (leave.leave_status !== LeaveStatus.PENDING) throw new BadRequestException('Only PENDING leave requests can be approved');

    await this.db.execute(`UPDATE stylist_leaves SET leave_status = 'approved' WHERE id = ?`, [id]);
    await this.db.execute(`UPDATE stylists SET stylist_status = 'on_leave' WHERE id = ?`, [leave.stylist_id]);

    if (leave.leave_start && leave.leave_end) {
      await this.db.execute(
        `UPDATE time_slots SET slot_status = ?, block_reason = ? WHERE stylist_id = ? AND slot_date = ? AND start_time >= ? AND end_time <= ? AND slot_status = 'available' AND status = 1`,
        [SlotStatus.BOOKED, BlockReason.LEAVE, leave.stylist_id, leave.leave_date, leave.leave_start, leave.leave_end],
      );
    } else {
      await this.db.execute(
        `UPDATE time_slots SET slot_status = ?, block_reason = ? WHERE stylist_id = ? AND slot_date = ? AND slot_status = 'available' AND status = 1`,
        [SlotStatus.BOOKED, BlockReason.LEAVE, leave.stylist_id, leave.leave_date],
      );
    }
    return { message: 'Leave approved and time slots blocked' };
  }

  async reject(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id);
    if (leave.leave_status !== LeaveStatus.PENDING) throw new BadRequestException('Only PENDING leave requests can be rejected');
    await this.db.execute(`UPDATE stylist_leaves SET leave_status = 'rejected' WHERE id = ?`, [id]);
    return { message: 'Leave request rejected' };
  }

  async cancel(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id);
    if (leave.leave_status !== LeaveStatus.PENDING) throw new BadRequestException('Only PENDING leave requests can be cancelled');
    await this.db.execute(`UPDATE stylist_leaves SET leave_status = 'rejected', status = 0 WHERE id = ?`, [id]);
    return { message: 'Leave request cancelled' };
  }

  async revoke(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id);
    if (leave.leave_status !== LeaveStatus.APPROVED) throw new BadRequestException('Only APPROVED leave requests can be revoked');

    await this.db.execute(`UPDATE stylist_leaves SET leave_status = 'rejected' WHERE id = ?`, [id]);
    await this.db.execute(`UPDATE stylists SET stylist_status = 'active' WHERE id = ?`, [leave.stylist_id]);
    await this.db.execute(
      `UPDATE time_slots SET slot_status = 'available', block_reason = NULL WHERE stylist_id = ? AND slot_date = ? AND block_reason = 'leave' AND status = 1`,
      [leave.stylist_id, leave.leave_date],
    );
    return { message: 'Leave revoked and time slots released' };
  }
}
