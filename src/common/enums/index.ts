export enum UserRole {
  ADMIN = 'admin',
  STYLIST = 'stylist',
  RECEPTIONIST = 'receptionist',
}

export enum ServiceCategory {
  HAIR = 'hair',
  SKIN = 'skin',
  NAILS = 'nails',
  MAKEUP = 'makeup',
  SPA = 'spa',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  UNISEX = 'unisex',
}

export enum StylistSpecialisation {
  HAIR_STYLIST = 'hair_stylist',
  BEAUTICIAN = 'beautician',
  MAKEUP_ARTIST = 'makeup_artist',
  SPA_THERAPIST = 'spa_therapist',
}

export enum StylistStatus {
  ACTIVE = 'active',
  ON_LEAVE = 'on_leave',
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

export enum AppointmentServiceStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
}

export enum SlotStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
}

export enum BlockReason {
  APPOINTMENT = 'appointment',
  LEAVE = 'leave',
}

export enum PaymentMethod {
  CASH = 'cash',
  CARD = 'card',
  UPI = 'upi',
  WALLET = 'wallet',
}

export enum BillStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export enum LeaveStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}
