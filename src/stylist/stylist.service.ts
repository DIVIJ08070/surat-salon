import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateStylistDto } from './dto/create-stylist.dto';
import { UpdateStylistDto } from './dto/update-stylist.dto';
import { AssignServicesDto } from './dto/assign-services.dto';
import { IStylist } from './interfaces/stylist.interface';
import { StylistSpecialisation, StylistStatus, UserRole } from 'src/common/enums';
import {
  INSERT_STYLIST,
  COUNT_ALL_STYLISTS,
  FIND_ALL_STYLISTS_BASE,
  FIND_ALL_STYLISTS_ADMIN,
  FIND_STYLIST_BY_ID_BASE,
  FIND_STYLIST_BY_ID_ADMIN,
  CHECK_STYLIST_EXISTS,
  DELETE_STYLIST,
  CHECK_SERVICE_IDS_VALID,
  INSERT_STYLIST_SERVICE,
  FIND_STYLIST_SERVICES,
  CHECK_STYLIST_SERVICE_ASSIGNED,
  REMOVE_STYLIST_SERVICE,
  UPDATE_STYLIST,
  FIND_STYLIST_BY_USER_ID,
} from './stylist.query';

@Injectable()
export class StylistService {
  constructor(private readonly db: DatabaseService) { }

  async create(dto: CreateStylistDto, role: UserRole, userId?: number): Promise<IStylist> {
    const commissionRate = dto.commissionRate ?? 0;
    await this.db.execute(INSERT_STYLIST, [
      dto.name ?? null,
      dto.specialisation ?? null,
      dto.workingDays ?? null,
      dto.shiftStart ?? null,
      dto.shiftEnd ?? null,
      commissionRate,
      userId ?? null,
    ]);

    const query = role === UserRole.ADMIN ? FIND_STYLIST_BY_ID_ADMIN : FIND_STYLIST_BY_ID_BASE;
    // Note: SELECT * ... ORDER BY id DESC is used here to get the last inserted.
    // However, I'll use a specific query for "last inserted" if I can, but let's stick to the current logic pattern.
    const rows = await this.db.query<IStylist>(`SELECT * FROM stylists ORDER BY id DESC LIMIT 1`);
    return rows[0];
  }

  async findAll(
    role: UserRole,
    specialisation?: StylistSpecialisation,
    stylistStatus?: StylistStatus,
    page = 1,
    limit = 10,
    serviceIds?: number[],
  ): Promise<{ data: IStylist[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const offset = (page - 1) * limit;
    const params: (string | number)[] = [];
    let whereSql = `WHERE s.status = 1`;
    let joinSql = '';
    let groupSql = '';
    let havingSql = '';

    if (specialisation) { whereSql += ` AND s.specialisation = ?`; params.push(specialisation); }
    if (stylistStatus) { whereSql += ` AND s.stylist_status = ?`; params.push(stylistStatus); }

    if (serviceIds && serviceIds.length > 0) {
      const placeholders = serviceIds.map(() => '?').join(',');
      joinSql = `JOIN stylist_services ss ON ss.stylist_id = s.id AND ss.status = 1`;
      whereSql += ` AND ss.service_id IN (${placeholders})`;
      params.push(...serviceIds);
      groupSql = `GROUP BY s.id`;
      havingSql = `HAVING COUNT(DISTINCT ss.service_id) = ${serviceIds.length}`;
    }

    // Count is more complex with GROUP BY / HAVING
    const countSql = `
      SELECT COUNT(*) as total FROM (
        SELECT s.id 
        FROM stylists s 
        ${joinSql} 
        ${whereSql} 
        ${groupSql} 
        ${havingSql}
      ) as filtered_stylists
    `;

    const countRows = await this.db.query<{ total: string }>(countSql, params);
    const total = parseInt(countRows[0]?.total || '0', 10);

    const cols = role === UserRole.ADMIN
      ? 's.id, s.name, s.specialisation, s.working_days, s.shift_start, s.shift_end, s.stylist_status, s.commission_rate, s.created_at'
      : 's.id, s.name, s.specialisation, s.working_days, s.shift_start, s.shift_end, s.stylist_status, s.created_at';

    const dataSql = `
      SELECT ${cols} 
      FROM stylists s 
      ${joinSql} 
      ${whereSql} 
      ${groupSql} 
      ${havingSql} 
      ORDER BY s.name ASC 
      LIMIT ? OFFSET ?
    `;

    const data = await this.db.query<IStylist>(
      dataSql,
      [...params, limit, offset],
    );
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: number, role: UserRole): Promise<IStylist> {
    const query = role === UserRole.ADMIN ? FIND_STYLIST_BY_ID_ADMIN : FIND_STYLIST_BY_ID_BASE;
    const rows = await this.db.query<IStylist>(query, [id]);
    if (!rows.length) throw new NotFoundException(`Stylist with id ${id} not found`);
    return rows[0];
  }

  async update(id: number, dto: UpdateStylistDto, role: UserRole): Promise<IStylist> {
    await this.findOne(id, role);

    const fields: string[] = [];
    const params: (string | number)[] = [];

    if (dto.name !== undefined) { fields.push('name = ?'); params.push(dto.name); }
    if (dto.specialisation !== undefined) { fields.push('specialisation = ?'); params.push(dto.specialisation); }
    if (dto.workingDays !== undefined) { fields.push('working_days = ?'); params.push(dto.workingDays); }
    if (dto.shiftStart !== undefined) { fields.push('shift_start = ?'); params.push(dto.shiftStart); }
    if (dto.shiftEnd !== undefined) { fields.push('shift_end = ?'); params.push(dto.shiftEnd); }
    if (dto.commissionRate !== undefined) { fields.push('commission_rate = ?'); params.push(dto.commissionRate); }
    if (dto.stylistStatus !== undefined) { fields.push('stylist_status = ?'); params.push(dto.stylistStatus); }

    if (fields.length) {
      await this.db.execute(UPDATE_STYLIST(fields), [...params, id]);
    }
    return this.findOne(id, role);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id, UserRole.ADMIN);
    await this.db.execute(DELETE_STYLIST, [id]);
    return { message: 'Stylist deleted successfully' };
  }

  async assignServices(stylistId: number, dto: AssignServicesDto): Promise<{ message: string }> {
    await this.findOne(stylistId, UserRole.ADMIN);

    const placeholders = dto.serviceIds.map(() => '?').join(', ');
    const validServices = await this.db.query<{ id: number }>(CHECK_SERVICE_IDS_VALID(placeholders), dto.serviceIds);
    if (validServices.length !== dto.serviceIds.length) {
      throw new BadRequestException('One or more service IDs are invalid or inactive');
    }

    for (const serviceId of dto.serviceIds) {
      await this.db.execute(INSERT_STYLIST_SERVICE, [stylistId, serviceId, stylistId, serviceId]);
    }
    return { message: `${dto.serviceIds.length} service(s) assigned to stylist successfully` };
  }

  async getStylistServices(stylistId: number): Promise<IStylist[]> {
    await this.findOne(stylistId, UserRole.ADMIN);
    return this.db.query<IStylist>(FIND_STYLIST_SERVICES, [stylistId]);
  }

  async removeService(stylistId: number, serviceId: number): Promise<{ message: string }> {
    await this.findOne(stylistId, UserRole.ADMIN);
    const rows = await this.db.query<{ id: number }>(CHECK_STYLIST_SERVICE_ASSIGNED, [stylistId, serviceId]);
    if (!rows.length) throw new NotFoundException(`Service ${serviceId} is not assigned to stylist ${stylistId}`);
    await this.db.execute(REMOVE_STYLIST_SERVICE, [stylistId, serviceId]);
    return { message: 'Service removed from stylist successfully' };
  }

  async findByUserId(userId: number): Promise<IStylist> {
    const rows = await this.db.query<IStylist>(FIND_STYLIST_BY_USER_ID, [userId]);
    if (!rows.length) throw new NotFoundException('Stylist profile not found for this user');
    return rows[0];
  }
}
