import { UserRole } from 'src/common/enums';

export interface IUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  // Make these optional since we hide them from the frontend
  password_hash?: string;
  failed_attempts?: number;
  locked_until?: Date | null;
  status?: number;
  updated_at?: string;
}

export interface IRefreshToken {
  id: number;
  user_id: number;
  token: string;
  status: number;
  expires_at: string;
  created_at: string;
}

export interface ITokenBlacklist {
  id: number;
  jti: string;
  expires_at: string;
  created_at: string;
}
