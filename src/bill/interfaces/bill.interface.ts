import { BillStatus, PaymentMethod } from 'src/common/enums';

export interface IBill {
  id: number;
  appointment_id: number;
  bill_number: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  payment_method: PaymentMethod | null;
  bill_status: BillStatus;
  paid_at: string | null;
  status: number;
  created_at: string;
  updated_at: string;
}
