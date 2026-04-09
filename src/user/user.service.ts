import { Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateUserDto } from './dto/create-user.dto';
import { IUser } from './interfaces/user.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(private readonly db: DatabaseService) {}

  async create(dto: CreateUserDto): Promise<IUser> {
    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.db.execute(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
      [dto.email, passwordHash, dto.role],
    );

    const rows = await this.db.query<IUser>(
      `SELECT * FROM users WHERE email = ? LIMIT 1`,
      [dto.email],
    );
    return rows[0];
  }

  async findByEmail(email: string): Promise<IUser | null> {
    const rows = await this.db.query<IUser>(
      `SELECT * FROM users WHERE email = ? AND status = 1 LIMIT 1`,
      [email],
    );
    return rows[0] ?? null;
  }

  async findById(id: number): Promise<IUser | null> {
    const rows = await this.db.query<IUser>(
      `SELECT * FROM users WHERE id = ? AND status = 1 LIMIT 1`,
      [id],
    );
    return rows[0] ?? null;
  }

  async lockAccount(id: number, lockedUntil: Date, failedAttempts: number): Promise<void> {
    await this.db.execute(
      `UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?`,
      [failedAttempts, lockedUntil, id],
    );
  }

  async incrementFailedAttempts(id: number, failedAttempts: number): Promise<void> {
    await this.db.execute(
      `UPDATE users SET failed_attempts = ? WHERE id = ?`,
      [failedAttempts, id],
    );
  }

  async resetFailedAttempts(id: number): Promise<void> {
    await this.db.execute(
      `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = ?`,
      [id],
    );
  }
}
