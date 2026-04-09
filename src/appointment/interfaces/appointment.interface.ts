import { AppointmentStatus, AppointmentServiceStatus } from 'src/common/enums';

export interface IAppointment {
  id: number;
  appointment_number: string;
  customer_id: number;
  stylist_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  total_duration_minutes: number;
  total_amount: number;
  appointment_status: AppointmentStatus;
  notes: string | null;
  status: number;
  created_at: string;
  updated_at: string;
}

export interface IAppointmentService {
  id: number;
  appointment_id: number;
  service_id: number;
  price_at_booking: number;
  duration_minutes: number;
  appointment_service_status: AppointmentServiceStatus;
  status: number;
  created_at: string;
  updated_at: string;
}
