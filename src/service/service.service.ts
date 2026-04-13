import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { IService } from './interfaces/service.interface';
import { ServiceCategory, Gender } from 'src/common/enums';
import {
  GENERATE_SERVICE_CODE,
  INSERT_SERVICE,
  FIND_SERVICE_BY_CODE,
  COUNT_ALL_SERVICES,
  FIND_ALL_SERVICES,
  FIND_SERVICE_BY_ID,
  TOGGLE_SERVICE_AVAILABILITY,
  UPDATE_SERVICE,
  DELETE_SERVICE,
} from './service.query';

@Injectable()
export class ServiceService {
  constructor(private readonly db: DatabaseService) {}

  private async generateServiceCode(): Promise<string> {
    const rows = await this.db.query<{ max_num: number | null }>(GENERATE_SERVICE_CODE);
    const maxNum = Number(rows[0]?.max_num ?? 0);
    return `SRV-${String(maxNum + 1).padStart(3, '0')}`;
  }

  async create(dto: CreateServiceDto): Promise<IService> {
    const serviceCode = await this.generateServiceCode();
    const gender = dto.gender ?? Gender.UNISEX;

    await this.db.execute(INSERT_SERVICE, [
      serviceCode,
      dto.name,
      dto.category,
      dto.durationMinutes,
      dto.price,
      gender,
      dto.description ?? null,
    ]);

    const rows = await this.db.query<IService>(FIND_SERVICE_BY_CODE, [serviceCode]);
    return rows[0];
  }

  async findAll(
    category?: ServiceCategory,
    gender?: Gender,
    search?: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: IService[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const offset = (page - 1) * limit;
    const params: (string | number)[] = [];
    let whereSql = `WHERE status = 1`;

    if (category) {
      whereSql += ` AND category = ?`;
      params.push(category);
    }
    if (gender) {
      whereSql += ` AND gender = ?`;
      params.push(gender);
    }
    if (search) {
      whereSql += ` AND name LIKE ?`;
      params.push(`%${search}%`);
    }

    const countRows = await this.db.query<{ total: string }>(`SELECT COUNT(*) AS total FROM services ${whereSql}`, params);
    const total = parseInt(countRows[0].total, 10);

    const data = await this.db.query<IService>(
      `SELECT id, service_code, name, category, duration_minutes, price, gender, description, is_available, created_at FROM services ${whereSql} ORDER BY category ASC, name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number): Promise<IService> {
    const rows = await this.db.query<IService>(FIND_SERVICE_BY_ID, [id]);
    if (!rows.length) throw new NotFoundException(`Service with id ${id} not found`);
    return rows[0];
  }

  async update(id: number, dto: UpdateServiceDto): Promise<IService> {
    await this.findOne(id);
    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (dto.name !== undefined)            { fields.push('name = ?');             params.push(dto.name); }
    if (dto.category !== undefined)        { fields.push('category = ?');         params.push(dto.category); }
    if (dto.durationMinutes !== undefined) { fields.push('duration_minutes = ?'); params.push(dto.durationMinutes); }
    if (dto.price !== undefined)           { fields.push('price = ?');            params.push(dto.price); }
    if (dto.gender !== undefined)          { fields.push('gender = ?');           params.push(dto.gender); }
    if (dto.description !== undefined)     { fields.push('description = ?');      params.push(dto.description); }
    if (dto.isAvailable !== undefined)     { fields.push('is_available = ?');     params.push(dto.isAvailable); }

    if (fields.length) {
      await this.db.execute(UPDATE_SERVICE(fields), [...params, id]);
    }
    return this.findOne(id);
  }

  async toggleAvailability(id: number): Promise<IService> {
    await this.findOne(id);
    await this.db.execute(TOGGLE_SERVICE_AVAILABILITY, [id]);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.db.execute(DELETE_SERVICE, [id]);
    return { message: 'Service deleted successfully' };
  }
}
