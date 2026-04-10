import { Gender } from 'src/common/enums';

export interface ICustomer {
  id: number;
  customer_code: string;
  name: string;
  phone: string;
  email: string | null;
  gender: Gender | null;
  dob: string | null;
  created_at: string;
  // Internal metadata
  status?: number;
  updated_at?: string;
}
