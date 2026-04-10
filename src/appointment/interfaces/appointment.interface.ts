import { AppointmentStatus, AppointmentServiceStatus } from 'src/common/enums';

export interface IAppointment {
  id: number;
  appointment_number: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  total_duration_minutes: number;
  total_amount: number;
  appointment_status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  // Internal metadata or redundant IDs
  customer_id?: number;
  stylist_id?: number;
  status?: number;
  updated_at?: string;
}

export interface IAppointmentService {
  id: number;
  appointment_id: number;
  service_id: number;
  price_at_booking: number;
  duration_minutes: number;
  appointment_service_status: AppointmentServiceStatus;
  created_at: string;
  // Internal metadata
  status?: number;
  updated_at?: string;
}
