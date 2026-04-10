import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { IUser } from './interfaces/user.interface';
import * as bcrypt from 'bcrypt';
import {
  INSERT_USER,
  FIND_USER_BY_EMAIL_AFTER_INSERT,
  FIND_USER_WITH_SECRETS_BY_EMAIL,
  FIND_USER_WITH_SECRETS_BY_ID,
  FIND_USER_BY_EMAIL_SAFE,
  FIND_USER_BY_ID_SAFE,
  UPDATE_USER_FAILED_ATTEMPTS,
  RESET_USER_FAILED_ATTEMPTS,
  LOCK_USER_ACCOUNT,
} from './user.query';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateUserDto): Promise<IUser> {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.db.execute(INSERT_USER, [dto.email, passwordHash, dto.role]);
    const rows = await this.db.query<IUser>(FIND_USER_BY_EMAIL_AFTER_INSERT, [dto.email]);
    return rows[0];
  }

  async findWithSecretsByEmail(email: string): Promise<IUser | null> {
    const rows = await this.db.query<IUser>(FIND_USER_WITH_SECRETS_BY_EMAIL, [email]);
    return rows[0] ?? null;
  }

  async findWithSecretsById(id: number): Promise<IUser | null> {
    const rows = await this.db.query<IUser>(FIND_USER_WITH_SECRETS_BY_ID, [id]);
    return rows[0] ?? null;
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const rows = await this.db.query<IUser>(FIND_USER_BY_EMAIL_SAFE, [email]);
    return rows[0] ?? null;
  }

  async findById(id: number): Promise<IUser | null> {
    const rows = await this.db.query<IUser>(FIND_USER_BY_ID_SAFE, [id]);
    return rows[0] ?? null;
  }

  async lockAccount(id: number, lockedUntil: Date, failedAttempts: number): Promise<void> {
    await this.db.execute(LOCK_USER_ACCOUNT, [failedAttempts, lockedUntil, id]);
  }

  async incrementFailedAttempts(id: number, failedAttempts: number): Promise<void> {
    await this.db.execute(UPDATE_USER_FAILED_ATTEMPTS, [failedAttempts, id]);
  }

  async resetFailedAttempts(id: number): Promise<void> {
    await this.db.execute(RESET_USER_FAILED_ATTEMPTS, [id]);
  }
}
