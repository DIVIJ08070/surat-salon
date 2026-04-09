import { LeaveStatus } from 'src/common/enums';

export interface IStylistLeave {
  id: number;
  stylist_id: number;
  leave_date: string;
  leave_start: string | null;
  leave_end: string | null;
  reason: string | null;
  leave_status: LeaveStatus;
  status: number;
  created_at: string;
  updated_at: string;
  // joined
  stylist_name?: string;
}
