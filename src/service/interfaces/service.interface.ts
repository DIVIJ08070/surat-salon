import { ServiceCategory, Gender } from 'src/common/enums';

export interface IService {
  id: number;
  service_code: string;
  name: string;
  category: ServiceCategory;
  duration_minutes: number;
  price: number;
  gender: Gender;
  description: string | null;
  is_available: number;
  created_at: string;
  // Internal metadata
  status?: number;
  updated_at?: string;
}
