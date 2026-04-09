export interface AuthUser {
  user_id: number;
  email: string;
  role: string;
  stylistId?: number;  // set when role === 'stylist', maps user → stylist profile
}

