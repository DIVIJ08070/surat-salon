import { UserRole } from 'src/common/enums';

export interface IUser {
  id: number;
  username: string;
  email: string;
  password_hash: string;
  role: UserRole;
  failed_attempts: number;
  locked_until: Date | null;
  status: number;
  created_at: string;
  updated_at: string;
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
