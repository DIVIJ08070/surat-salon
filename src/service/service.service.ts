import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Service } from 'src/entities';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { ServiceCategory, Gender } from 'src/common/enums';

@Injectable()
export class ServiceService {
  constructor(
    @InjectRepository(Service)
    private readonly serviceRepository: Repository<Service>,
  ) {}

  // ─── AUTO-GENERATE SERVICE CODE ───────────────────────────────────────────────
  // Format: SVC001, SVC002, ...
  private async generateServiceCode(): Promise<string> {
    const rows: { service_code: string }[] = await this.serviceRepository.query(
      `SELECT service_code FROM services ORDER BY id DESC LIMIT 1`,
    );

    if (!rows || rows.length === 0) {
      return 'SVC001';
    }

    const lastCode = rows[0].service_code; // e.g. "SVC007"
    const num = parseInt(lastCode.replace('SVC', ''), 10); // → 7
    const next = num + 1;
    return `SVC${String(next).padStart(3, '0')}`; // → "SVC008"
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────

  async create(dto: CreateServiceDto): Promise<Service[]> {
    const serviceCode = await this.generateServiceCode();
    const gender = dto.gender ?? Gender.UNISEX;
    const description = dto.description ?? null;

    await this.serviceRepository.query(
      `INSERT INTO services (service_code, name, category, duration_minutes, price, gender, description)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [serviceCode, dto.name, dto.category, dto.durationMinutes, dto.price, gender, description],
    );

    return this.serviceRepository.query(
      `SELECT * FROM services WHERE service_code = ?`,
      [serviceCode],
    );
  }

  // ─── READ ALL ─────────────────────────────────────────────────────────────────

  async findAll(category?: ServiceCategory, gender?: Gender): Promise<Service[]> {
    let sql = `SELECT * FROM services WHERE status = 1`;
    const params: string[] = [];

    if (category) {
      sql += ` AND category = ?`;
      params.push(category);
    }
    if (gender) {
      sql += ` AND gender = ?`;
      params.push(gender);
    }

    sql += ` ORDER BY category ASC, name ASC`;

    return this.serviceRepository.query(sql, params);
  }

  // ─── READ ONE ─────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<Service> {
    const rows: Service[] = await this.serviceRepository.query(
      `SELECT * FROM services WHERE id = ? AND status = 1`,
      [id],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Service with id ${id} not found`);
    }

    return rows[0];
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateServiceDto): Promise<Service[]> {
    // Ensure service exists
    await this.findOne(id);

    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (dto.name !== undefined) {
      fields.push('name = ?');
      params.push(dto.name);
    }
    if (dto.category !== undefined) {
      fields.push('category = ?');
      params.push(dto.category);
    }
    if (dto.durationMinutes !== undefined) {
      fields.push('duration_minutes = ?');
      params.push(dto.durationMinutes);
    }
    if (dto.price !== undefined) {
      fields.push('price = ?');
      params.push(dto.price);
    }
    if (dto.gender !== undefined) {
      fields.push('gender = ?');
      params.push(dto.gender);
    }
    if (dto.description !== undefined) {
      fields.push('description = ?');
      params.push(dto.description);
    }
    if (dto.isAvailable !== undefined) {
      fields.push('is_available = ?');
      params.push(dto.isAvailable);
    }

    if (fields.length === 0) {
      return this.serviceRepository.query(
        `SELECT * FROM services WHERE id = ?`,
        [id],
      );
    }

    params.push(id);
    await this.serviceRepository.query(
      `UPDATE services SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );

    return this.serviceRepository.query(
      `SELECT * FROM services WHERE id = ?`,
      [id],
    );
  }

  // ─── TOGGLE AVAILABILITY ──────────────────────────────────────────────────────

  async toggleAvailability(id: number): Promise<Service[]> {
    await this.findOne(id); // throws 404 if not found

    await this.serviceRepository.query(
      `UPDATE services SET is_available = IF(is_available = 1, 0, 1) WHERE id = ?`,
      [id],
    );

    return this.serviceRepository.query(
      `SELECT * FROM services WHERE id = ?`,
      [id],
    );
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────────

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id); // throws 404 if not found

    await this.serviceRepository.query(
      `UPDATE services SET status = 127 WHERE id = ?`,
      [id],
    );

    return { message: 'Service deleted successfully' };
  }
}
