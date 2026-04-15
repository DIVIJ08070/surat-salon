import { Injectable, InternalServerErrorException, HttpException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
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
  FIND_ALL_USERS,
} from './user.query';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) { }

  async create(dto: CreateUserDto): Promise<IUser> {
    try {
      const passwordHash = await bcrypt.hash(dto.password, 10);
      await this.db.execute(INSERT_USER, [dto.name, dto.email, passwordHash, dto.role]);
      const rows = await this.db.query<IUser>(FIND_USER_BY_EMAIL_AFTER_INSERT, [dto.email]);
      return rows[0];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async findAll(): Promise<IUser[]> {
    try {
      return this.db.query<IUser>(FIND_ALL_USERS);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async findWithSecretsByEmail(email: string): Promise<IUser | null> {
    try {
      const rows = await this.db.query<IUser>(FIND_USER_WITH_SECRETS_BY_EMAIL, [email]);
      return rows[0] ?? null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async findWithSecretsById(id: number): Promise<IUser | null> {
    try {
      const rows = await this.db.query<IUser>(FIND_USER_WITH_SECRETS_BY_ID, [id]);
      return rows[0] ?? null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async findByEmail(email: string): Promise<IUser | null> {
    try {
      const rows = await this.db.query<IUser>(FIND_USER_BY_EMAIL_SAFE, [email]);
      return rows[0] ?? null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async findById(id: number): Promise<IUser | null> {
    try {
      const rows = await this.db.query<IUser>(FIND_USER_BY_ID_SAFE, [id]);
      return rows[0] ?? null;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async lockAccount(id: number, lockedUntil: Date, failedAttempts: number): Promise<void> {
    try {
      await this.db.execute(LOCK_USER_ACCOUNT, [failedAttempts, lockedUntil, id]);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async incrementFailedAttempts(id: number, failedAttempts: number): Promise<void> {
    try {
      await this.db.execute(UPDATE_USER_FAILED_ATTEMPTS, [failedAttempts, id]);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async resetFailedAttempts(id: number): Promise<void> {
    try {
      await this.db.execute(RESET_USER_FAILED_ATTEMPTS, [id]);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
