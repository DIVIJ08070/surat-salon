import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { LeaveStatus, SlotStatus, BlockReason } from 'src/common/enums';
import {
  CHECK_STYLIST_FOR_LEAVE,
  CHECK_DUPLICATE_LEAVE,
  INSERT_STYLIST_LEAVE,
  FIND_LEAVE_AFTER_INSERT,
  FIND_ALL_LEAVES,
  FIND_LEAVES_BY_STYLIST,
  FIND_LEAVE_BY_ID,
  APPROVE_LEAVE,
  REJECT_LEAVE,
  CANCEL_LEAVE,
  SET_STYLIST_ON_LEAVE,
  SET_STYLIST_ACTIVE,
  BLOCK_SLOTS_PARTIAL_LEAVE,
  BLOCK_SLOTS_FULL_DAY_LEAVE,
  RELEASE_SLOTS_ON_REVOKE,
} from './stylist-leave.query';

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
    const stylistRows = await this.db.query<{ id: number }>(CHECK_STYLIST_FOR_LEAVE, [dto.stylistId]);
    if (!stylistRows.length) throw new NotFoundException(`Stylist with id ${dto.stylistId} not found`);

    const duplicate = await this.db.query<{ id: number }>(CHECK_DUPLICATE_LEAVE, [dto.stylistId, dto.leaveDate]);
    if (duplicate.length) throw new BadRequestException(`Leave already exists for stylist on ${dto.leaveDate}`);

    await this.db.execute(INSERT_STYLIST_LEAVE, [
      dto.stylistId,
      dto.leaveDate,
      dto.leaveStart ?? null,
      dto.leaveEnd ?? null,
      dto.reason ?? null,
    ]);

    const rows = await this.db.query<LeaveRow>(FIND_LEAVE_AFTER_INSERT);
    return rows[0];
  }

  async findAll(stylistId?: number): Promise<LeaveRow[]> {
    if (stylistId) {
      return this.db.query<LeaveRow>(FIND_LEAVES_BY_STYLIST, [stylistId]);
    }
    return this.db.query<LeaveRow>(FIND_ALL_LEAVES);
  }

  async findOne(id: number): Promise<LeaveRow> {
    const rows = await this.db.query<LeaveRow>(FIND_LEAVE_BY_ID, [id]);
    if (!rows.length) throw new NotFoundException(`Leave request with id ${id} not found`);
    return rows[0];
  }

  async approve(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id);
    if (leave.leave_status !== LeaveStatus.PENDING) throw new BadRequestException('Only PENDING leave requests can be approved');

    await this.db.execute(APPROVE_LEAVE, [id]);

    if (leave.leave_start && leave.leave_end) {
      await this.db.execute(BLOCK_SLOTS_PARTIAL_LEAVE, [
        SlotStatus.BOOKED,
        BlockReason.LEAVE,
        leave.stylist_id,
        leave.leave_date,
        leave.leave_start,
        leave.leave_end,
      ]);
    } else {
      await this.db.execute(BLOCK_SLOTS_FULL_DAY_LEAVE, [
        SlotStatus.BOOKED,
        BlockReason.LEAVE,
        leave.stylist_id,
        leave.leave_date,
      ]);
    }
    return { message: 'Leave approved and time slots blocked' };
  }

  async reject(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id);
    if (leave.leave_status !== LeaveStatus.PENDING) throw new BadRequestException('Only PENDING leave requests can be rejected');
    await this.db.execute(REJECT_LEAVE, [id]);
    return { message: 'Leave request rejected' };
  }

  async cancel(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id);
    if (leave.leave_status !== LeaveStatus.PENDING) throw new BadRequestException('Only PENDING leave requests can be cancelled');
    await this.db.execute(CANCEL_LEAVE, [id]);
    return { message: 'Leave request cancelled' };
  }

  async revoke(id: number): Promise<{ message: string }> {
    const leave = await this.findOne(id);
    if (leave.leave_status !== LeaveStatus.APPROVED) throw new BadRequestException('Only APPROVED leave requests can be revoked');

    await this.db.execute(REJECT_LEAVE, [id]); // Note: Using reject query for revocation status update
    await this.db.execute(RELEASE_SLOTS_ON_REVOKE, [leave.stylist_id, leave.leave_date]);
    return { message: 'Leave revoked and time slots released' };
  }
}
