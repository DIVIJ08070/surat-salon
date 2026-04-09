import { SlotStatus, BlockReason } from 'src/common/enums';

export interface ITimeSlot {
  id: number;
  stylist_id: number;
  appointment_id: number | null;
  slot_date: string;
  start_time: string;
  end_time: string;
  slot_status: SlotStatus;
  block_reason: BlockReason | null;
  status: number;
  created_at: string;
  updated_at: string;
}
