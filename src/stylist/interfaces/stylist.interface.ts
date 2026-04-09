import { StylistStatus, StylistSpecialisation } from 'src/common/enums';

export interface IStylist {
  id: number;
  stylist_code: string;
  name: string;
  phone: string;
  email: string | null;
  specialisation: StylistSpecialisation;
  experience_years: number;
  commission_rate: number;
  stylist_status: StylistStatus;
  working_days: string;
  shift_start: string;
  shift_end: string;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface IStylistService {
  id: number;
  stylist_id: number;
  service_id: number;
  status: number;
  created_at: string;
}
