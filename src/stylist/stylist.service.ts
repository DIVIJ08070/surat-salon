import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateStylistDto } from './dto/create-stylist.dto';
import { UpdateStylistDto } from './dto/update-stylist.dto';
import { AssignServicesDto } from './dto/assign-services.dto';
import { IStylist } from './interfaces/stylist.interface';
import { StylistSpecialisation, StylistStatus, UserRole } from 'src/common/enums';

@Injectable()
export class StylistService {
  constructor(private readonly db: DatabaseService) {}

  private selectColumns(role: UserRole): string {
    const base = `id, name, specialisation, working_days, shift_start, shift_end,
                  stylist_status, status, created_at, updated_at`;
    return role === UserRole.ADMIN ? `${base}, commission_rate` : base;
  }

  async create(dto: CreateStylistDto, role: UserRole): Promise<IStylist> {
    const commissionRate = dto.commissionRate ?? 0;
    await this.db.execute(
      `INSERT INTO stylists (name, specialisation, working_days, shift_start, shift_end, commission_rate)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dto.name, dto.specialisation, dto.workingDays, dto.shiftStart, dto.shiftEnd, commissionRate],
    );
    const cols = this.selectColumns(role);
    const rows = await this.db.query<IStylist>(`SELECT ${cols} FROM stylists ORDER BY id DESC LIMIT 1`);
    return rows[0];
  }

  async findAll(
    role: UserRole,
    specialisation?: StylistSpecialisation,
    stylistStatus?: StylistStatus,
    page = 1,
    limit = 10,
  ): Promise<{ data: IStylist[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const offset = (page - 1) * limit;
    const cols = this.selectColumns(role);
    const params: (string | number)[] = [];
    let whereSql = `WHERE status = 1`;

    if (specialisation) { whereSql += ` AND specialisation = ?`; params.push(specialisation); }
    if (stylistStatus)  { whereSql += ` AND stylist_status = ?`; params.push(stylistStatus); }

    const countRows = await this.db.query<{ total: string }>(`SELECT COUNT(*) AS total FROM stylists ${whereSql}`, params);
    const total = parseInt(countRows[0].total, 10);

    const data = await this.db.query<IStylist>(
      `SELECT ${cols} FROM stylists ${whereSql} ORDER BY name ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number, role: UserRole): Promise<IStylist> {
    const cols = this.selectColumns(role);
    const rows = await this.db.query<IStylist>(`SELECT ${cols} FROM stylists WHERE id = ? AND status = 1`, [id]);
    if (!rows.length) throw new NotFoundException(`Stylist with id ${id} not found`);
    return rows[0];
  }

  async update(id: number, dto: UpdateStylistDto, role: UserRole): Promise<IStylist> {
    await this.findOne(id, role);

    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (dto.name !== undefined)          { fields.push('name = ?');           params.push(dto.name); }
    if (dto.specialisation !== undefined) { fields.push('specialisation = ?'); params.push(dto.specialisation); }
    if (dto.workingDays !== undefined)   { fields.push('working_days = ?');   params.push(dto.workingDays); }
    if (dto.shiftStart !== undefined)    { fields.push('shift_start = ?');    params.push(dto.shiftStart); }
    if (dto.shiftEnd !== undefined)      { fields.push('shift_end = ?');      params.push(dto.shiftEnd); }
    if (dto.commissionRate !== undefined){ fields.push('commission_rate = ?');params.push(dto.commissionRate); }
    if (dto.stylistStatus !== undefined) { fields.push('stylist_status = ?'); params.push(dto.stylistStatus); }

    if (fields.length) {
      await this.db.execute(`UPDATE stylists SET ${fields.join(', ')} WHERE id = ?`, [...params, id]);
    }
    return this.findOne(id, role);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id, UserRole.ADMIN);
    await this.db.execute(`UPDATE stylists SET status = 0 WHERE id = ?`, [id]);
    return { message: 'Stylist deleted successfully' };
  }

  async assignServices(stylistId: number, dto: AssignServicesDto): Promise<{ message: string }> {
    await this.findOne(stylistId, UserRole.ADMIN);

    const placeholders = dto.serviceIds.map(() => '?').join(', ');
    const validServices = await this.db.query<{ id: number }>(
      `SELECT id FROM services WHERE id IN (${placeholders}) AND status = 1`,
      dto.serviceIds,
    );
    if (validServices.length !== dto.serviceIds.length) {
      throw new BadRequestException('One or more service IDs are invalid or inactive');
    }

    for (const serviceId of dto.serviceIds) {
      await this.db.execute(
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

  async getStylistServices(stylistId: number): Promise<IStylist[]> {
    await this.findOne(stylistId, UserRole.ADMIN);
    return this.db.query<IStylist>(
      `SELECT s.id, s.service_code, s.name, s.category, s.duration_minutes,
              s.price, s.gender, s.description, s.is_available
       FROM stylist_services ss
       JOIN services s ON s.id = ss.service_id
       WHERE ss.stylist_id = ? AND ss.status = 1 AND s.status = 1
       ORDER BY s.category ASC, s.name ASC`,
      [stylistId],
    );
  }

  async removeService(stylistId: number, serviceId: number): Promise<{ message: string }> {
    await this.findOne(stylistId, UserRole.ADMIN);
    const rows = await this.db.query<{ id: number }>(
      `SELECT id FROM stylist_services WHERE stylist_id = ? AND service_id = ? AND status = 1`,
      [stylistId, serviceId],
    );
    if (!rows.length) throw new NotFoundException(`Service ${serviceId} is not assigned to stylist ${stylistId}`);
    await this.db.execute(`UPDATE stylist_services SET status = 0 WHERE stylist_id = ? AND service_id = ?`, [stylistId, serviceId]);
    return { message: 'Service removed from stylist successfully' };
  }
}
