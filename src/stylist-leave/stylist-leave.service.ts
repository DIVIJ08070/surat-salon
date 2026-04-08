import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { StylistLeave } from 'src/entities';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveStatus, SlotStatus, BlockReason } from 'src/common/enums';

@Injectable()
export class StylistLeaveService {
  constructor(
    @InjectRepository(StylistLeave)
    private readonly leaveRepository: Repository<StylistLeave>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── CREATE LEAVE REQUEST ─────────────────────────────────────────────────────

  async create(dto: CreateLeaveDto): Promise<object> {
    // Verify stylist exists and is active
    const stylistRows: { id: number }[] = await this.dataSource.query(
      `SELECT id FROM stylists WHERE id = ? AND status = 1`,
      [dto.stylistId],
    );
    if (!stylistRows.length) {
      throw new NotFoundException(`Stylist with id ${dto.stylistId} not found`);
    }

    // Prevent duplicate leave on same date (pending or approved)
    const duplicate: { id: number }[] = await this.dataSource.query(
      `SELECT id FROM stylist_leaves
       WHERE stylist_id = ? AND leave_date = ?
         AND leave_status IN ('pending', 'approved') AND status = 1`,
      [dto.stylistId, dto.leaveDate],
    );
    if (duplicate.length) {
      throw new BadRequestException(`Leave already exists for stylist on ${dto.leaveDate}`);
    }

    await this.leaveRepository.query(
      `INSERT INTO stylist_leaves (stylist_id, leave_date, leave_start, leave_end, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [dto.stylistId, dto.leaveDate, dto.leaveStart ?? null, dto.leaveEnd ?? null, dto.reason ?? null],
    );

    const rows: object[] = await this.leaveRepository.query(
      `SELECT * FROM stylist_leaves ORDER BY id DESC LIMIT 1`,
    );
    return rows[0];
  }

  // ─── READ ALL ─────────────────────────────────────────────────────────────────
  // Admin sees all; Stylist sees only their own (pass stylistId to filter)

  async findAll(stylistId?: number): Promise<object[]> {
    if (stylistId) {
      return this.leaveRepository.query(
        `SELECT sl.*, s.name AS stylist_name
         FROM stylist_leaves sl
         JOIN stylists s ON s.id = sl.stylist_id
         WHERE sl.stylist_id = ? AND sl.status = 1
         ORDER BY sl.leave_date DESC`,
        [stylistId],
      );
    }

    return this.leaveRepository.query(
      `SELECT sl.*, s.name AS stylist_name
       FROM stylist_leaves sl
       JOIN stylists s ON s.id = sl.stylist_id
       WHERE sl.status = 1
       ORDER BY sl.leave_date DESC`,
    );
  }

  // ─── READ ONE ─────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<object> {
    const rows: object[] = await this.leaveRepository.query(
      `SELECT sl.*, s.name AS stylist_name
       FROM stylist_leaves sl
       JOIN stylists s ON s.id = sl.stylist_id
       WHERE sl.id = ? AND sl.status = 1`,
      [id],
    );

    if (!rows.length) {
      throw new NotFoundException(`Leave request with id ${id} not found`);
    }

    return rows[0];
  }

  // ─── APPROVE LEAVE ────────────────────────────────────────────────────────────
  // On approval → block existing time slots for that day with block_reason = 'leave'

  async approve(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id) as Record<string, unknown>;

    if (leave['leave_status'] !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Only PENDING leave requests can be approved`);
    }

    // Update leave status to APPROVED
    await this.leaveRepository.query(
      `UPDATE stylist_leaves SET leave_status = 'approved' WHERE id = ?`,
      [id],
    );

    // Update stylist status to ON_LEAVE
    await this.dataSource.query(
      `UPDATE stylists SET stylist_status = 'on_leave' WHERE id = ?`,
      [leave['stylist_id']],
    );

    // Block existing time slots for this stylist on the leave date
    // If partial leave (leaveStart + leaveEnd set), block only those slots
    // If full-day leave, block all slots for that date
    if (leave['leave_start'] && leave['leave_end']) {
      await this.dataSource.query(
        `UPDATE time_slots
         SET slot_status = ?, block_reason = ?
         WHERE stylist_id = ? AND slot_date = ?
           AND start_time >= ? AND end_time <= ?
           AND slot_status = 'available' AND status = 1`,
        [
          SlotStatus.BOOKED,
          BlockReason.LEAVE,
          leave['stylist_id'],
          leave['leave_date'],
          leave['leave_start'],
          leave['leave_end'],
        ],
      );
    } else {
      await this.dataSource.query(
        `UPDATE time_slots
         SET slot_status = ?, block_reason = ?
         WHERE stylist_id = ? AND slot_date = ?
           AND slot_status = 'available' AND status = 1`,
        [SlotStatus.BOOKED, BlockReason.LEAVE, leave['stylist_id'], leave['leave_date']],
      );
    }

    return { message: 'Leave approved and time slots blocked' };
  }

  // ─── REJECT LEAVE ─────────────────────────────────────────────────────────────
  // On rejection → release any slots blocked for 'leave' on that date

  async reject(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id) as Record<string, unknown>;

    if (leave['leave_status'] !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Only PENDING leave requests can be rejected`);
    }

    await this.leaveRepository.query(
      `UPDATE stylist_leaves SET leave_status = 'rejected' WHERE id = ?`,
      [id],
    );

    return { message: 'Leave request rejected' };
  }

  // ─── CANCEL LEAVE (by stylist — only PENDING) ─────────────────────────────────

  async cancel(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id) as Record<string, unknown>;

    if (leave['leave_status'] !== LeaveStatus.PENDING) {
      throw new BadRequestException(`Only PENDING leave requests can be cancelled`);
    }

    await this.leaveRepository.query(
      `UPDATE stylist_leaves SET leave_status = 'rejected', status = 0 WHERE id = ?`,
      [id],
    );

    return { message: 'Leave request cancelled' };
  }

  // ─── REVOKE APPROVED LEAVE (Admin) ────────────────────────────────────────────
  // Admin revokes an already-approved leave → releases leave-blocked slots

  async revoke(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id) as Record<string, unknown>;

    if (leave['leave_status'] !== LeaveStatus.APPROVED) {
      throw new BadRequestException(`Only APPROVED leave requests can be revoked`);
    }

    // Update leave to rejected
    await this.leaveRepository.query(
      `UPDATE stylist_leaves SET leave_status = 'rejected' WHERE id = ?`,
      [id],
    );

    // Re-activate stylist status
    await this.dataSource.query(
      `UPDATE stylists SET stylist_status = 'active' WHERE id = ?`,
      [leave['stylist_id']],
    );

    // Release ONLY leave-blocked slots (never touch appointment-blocked slots)
    await this.dataSource.query(
      `UPDATE time_slots
       SET slot_status = 'available', block_reason = NULL
       WHERE stylist_id = ? AND slot_date = ?
         AND block_reason = 'leave' AND status = 1`,
      [leave['stylist_id'], leave['leave_date']],
    );

    return { message: 'Leave revoked and time slots released' };
  }
}
