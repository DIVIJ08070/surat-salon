import { StylistStatus, StylistSpecialisation } from 'src/common/enums';

export interface IStylist {
  id: number;
  stylist_code: string;
  name: string;
  phone: string;
  email: string | null;
  specialisation: StylistSpecialisation;
  experience_years: number;
  stylist_status: StylistStatus;
  working_days: string;
  shift_start: string;
  shift_end: string;
  created_at: string;
  commission_rate?: number;
  status?: number;
  updated_at?: string;
}

export interface IStylistService {
  id: number;
  stylist_id: number;
  service_id: number;
  created_at: string;
  status?: number;
}
