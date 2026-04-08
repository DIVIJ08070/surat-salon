import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../entities';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}
  async create(createUserDto: CreateUserDto): Promise<User> {
    const saltOrRounds = 10;
    const passwordHash = await bcrypt.hash(createUserDto.password, saltOrRounds);

    const user = this.userRepository.create({
      email: createUserDto.email,
      passwordHash,
      role: createUserDto.role,
    });
    return this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: {
        email: email,
        status: 1
      }
    });
  }
  async findById(id: number): Promise<User | null> {
    return this.userRepository.query(`SELECT * FROM users WHERE id = ? AND status = 1`, [id]);
  }

  async lockAccount(id: number, lockedUntil: Date, failedAttempts: number): Promise<void> {
    await this.userRepository.update(id, {
      lockedUntil,
      failedAttempts,
    });
  }

  async incrementFailedAttempts(id: number, failedAttempts: number): Promise<void> {
    await this.userRepository.update(id, {
      failedAttempts,
    });
  }

  async resetFailedAttempts(id: number): Promise<void> {
    await this.userRepository.update(id, {
      failedAttempts: 0,
      lockedUntil: null,
    });
  }
}
