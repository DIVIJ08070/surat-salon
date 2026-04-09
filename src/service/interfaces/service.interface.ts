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
  status: number;
  created_at: string;
  updated_at: string;
}
