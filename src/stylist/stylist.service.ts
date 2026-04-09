import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Stylist } from 'src/entities';
import { CreateStylistDto } from './dto/create-stylist.dto';
import { UpdateStylistDto } from './dto/update-stylist.dto';
import { AssignServicesDto } from './dto/assign-services.dto';
import { StylistSpecialisation, StylistStatus, UserRole } from 'src/common/enums';

@Injectable()
export class StylistService {
  constructor(
    @InjectRepository(Stylist)
    private readonly stylistRepository: Repository<Stylist>,
    private readonly dataSource: DataSource,
  ) {}

  // ─── ROLE-BASED COLUMN SELECTION ─────────────────────────────────────────────
  // Admins see commission_rate; Receptionists and Stylists do not.
  private selectColumns(role: UserRole): string {
    const base = `id, name, specialisation, working_days, shift_start, shift_end,
                  stylist_status, status, created_at, updated_at`;
    return role === UserRole.ADMIN ? `${base}, commission_rate` : base;
  }

  // ─── CREATE 

  async create(dto: CreateStylistDto, role: UserRole): Promise<object> {
    const commissionRate = dto.commissionRate ?? 0.00;

    await this.stylistRepository.query(
      `INSERT INTO stylists (name, specialisation, working_days, shift_start, shift_end, commission_rate)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dto.name, dto.specialisation, dto.workingDays, dto.shiftStart, dto.shiftEnd, commissionRate],
    );

    const cols = this.selectColumns(role);
    const rows: object[] = await this.stylistRepository.query(
      `SELECT ${cols} FROM stylists ORDER BY id DESC LIMIT 1`,
    );

    return rows[0];
  }

  // ─── READ ALL

  async findAll(
    role: UserRole,
    specialisation?: StylistSpecialisation,
    stylistStatus?: StylistStatus,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ data: Stylist[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const offset = (page - 1) * limit;
    const cols = this.selectColumns(role);
    const whereParams: string[] = [];
    let whereSql = `WHERE status = 1`;

    if (specialisation) {
      whereSql += ` AND specialisation = ?`;
      whereParams.push(specialisation);
    }
    if (stylistStatus) {
      whereSql += ` AND stylist_status = ?`;
      whereParams.push(stylistStatus);
    }

    const countRows: { total: string }[] = await this.stylistRepository.query(
      `SELECT COUNT(*) AS total FROM stylists ${whereSql}`,
      whereParams,
    );
    const total = parseInt(countRows[0].total, 10);

    const data: Stylist[] = await this.stylistRepository.query(
      `SELECT ${cols} FROM stylists ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...whereParams, limit, offset],
    );

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ─── READ ONE 

  async findOne(id: number, role: UserRole): Promise<object> {
    const cols = this.selectColumns(role);
    const rows: object[] = await this.stylistRepository.query(
      `SELECT ${cols} FROM stylists WHERE id = ? AND status = 1`,
      [id],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Stylist with id ${id} not found`);
    }

    return rows[0];
  }

  // ─── UPDATE

  async update(id: number, dto: UpdateStylistDto, role: UserRole): Promise<object> {
    await this.findOne(id, role); // throws 404 if not found

    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (dto.name !== undefined) {
      fields.push('name = ?');
      params.push(dto.name);
    }
    if (dto.specialisation !== undefined) {
      fields.push('specialisation = ?');
      params.push(dto.specialisation);
    }
    if (dto.workingDays !== undefined) {
      fields.push('working_days = ?');
      params.push(dto.workingDays);
    }
    if (dto.shiftStart !== undefined) {
      fields.push('shift_start = ?');
      params.push(dto.shiftStart);
    }
    if (dto.shiftEnd !== undefined) {
      fields.push('shift_end = ?');
      params.push(dto.shiftEnd);
    }
    if (dto.commissionRate !== undefined) {
      fields.push('commission_rate = ?');
      params.push(dto.commissionRate);
    }
    if (dto.stylistStatus !== undefined) {
      fields.push('stylist_status = ?');
      params.push(dto.stylistStatus);
    }

    if (fields.length === 0) {
      return this.findOne(id, role);
    }

    params.push(id);
    await this.stylistRepository.query(
      `UPDATE stylists SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );

    return this.findOne(id, role);
  }

  // ─── SOFT DELETE 

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id, UserRole.ADMIN); // throws 404 if not found

    await this.stylistRepository.query(
      `UPDATE stylists SET status = 127 WHERE id = ?`,
      [id],
    );

    return { message: 'Stylist deleted successfully' };
  }

  // ─── ASSIGN SERVICES TO STYLIST 

  async assignServices(stylistId: number, dto: AssignServicesDto): Promise<{ message: string }> {
    // Verify stylist exists
    await this.findOne(stylistId, UserRole.ADMIN);

    // Verify all provided service IDs actually exist and are active
    const placeholders = dto.serviceIds.map(() => '?').join(', ');
    const validServices: { id: number }[] = await this.dataSource.query(
      `SELECT id FROM services WHERE id IN (${placeholders}) AND status = 1`,
      dto.serviceIds,
    );

    if (validServices.length !== dto.serviceIds.length) {
      throw new BadRequestException('One or more service IDs are invalid or inactive');
    }

    // Upsert: insert only IDs not already assigned (ignore duplicates)
    for (const serviceId of dto.serviceIds) {
      await this.dataSource.query(
        `INSERT INTO stylist_services (stylist_id, service_id)
         SELECT ?, ? FROM DUAL
         WHERE NOT EXISTS (
           SELECT 1 FROM stylist_services WHERE stylist_id = ? AND service_id = ? AND status = 1
         )`,
        [stylistId, serviceId, stylistId, serviceId],
      );
    }

    return { message: `${dto.serviceIds.length} service(s) assigned to stylist successfully` };
  }

  // ─── GET SERVICES OF A STYLIST

  async getStylistServices(stylistId: number): Promise<object[]> {
    // Verify stylist exists
    await this.findOne(stylistId, UserRole.ADMIN);

    return this.dataSource.query(
      `SELECT s.id, s.service_code, s.name, s.category, s.duration_minutes,
              s.price, s.gender, s.description, s.is_available
       FROM stylist_services ss
       JOIN services s ON s.id = ss.service_id
       WHERE ss.stylist_id = ? AND ss.status = 1 AND s.status = 1
       ORDER BY s.category ASC, s.name ASC`,
      [stylistId],
    );
  }

  // ─── REMOVE A SERVICE FROM STYLIST 

  async removeService(stylistId: number, serviceId: number): Promise<{ message: string }> {
    // Verify stylist exists
    await this.findOne(stylistId, UserRole.ADMIN);

    const rows: { id: number }[] = await this.dataSource.query(
      `SELECT id FROM stylist_services WHERE stylist_id = ? AND service_id = ? AND status = 1`,
      [stylistId, serviceId],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Service ${serviceId} is not assigned to stylist ${stylistId}`);
    }

    await this.dataSource.query(
      `UPDATE stylist_services SET status = 0 WHERE stylist_id = ? AND service_id = ?`,
      [stylistId, serviceId],
    );

    return { message: 'Service removed from stylist successfully' };
  }
}
