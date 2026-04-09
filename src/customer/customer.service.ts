import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ICustomer } from './interfaces/customer.interface';

@Injectable()
export class CustomerService {
  constructor(private readonly db: DatabaseService) {}

  private async generateCustomerCode(): Promise<string> {
    const year = new Date().getFullYear();
    const rows = await this.db.query<{ max_num: number | null }>(
      `SELECT MAX(CAST(SUBSTRING_INDEX(customer_code, '-', -1) AS UNSIGNED)) AS max_num
       FROM customers WHERE customer_code REGEXP '^CUST-${year}-[0-9]+$'`,
    );
    const maxNum = Number(rows[0]?.max_num ?? 0);
    return `CUST-${year}-${String(maxNum + 1).padStart(3, '0')}`;
  }

  async create(dto: CreateCustomerDto): Promise<ICustomer> {
    const existing = await this.db.query<{ id: number }>(
      `SELECT id FROM customers WHERE phone = ? AND status = 1`,
      [dto.phone],
    );
    if (existing.length) throw new ConflictException(`Phone number '${dto.phone}' is already registered`);

    const customerCode = await this.generateCustomerCode();

    await this.db.execute(
      `INSERT INTO customers (customer_code, name, phone, email, gender, dob) VALUES (?, ?, ?, ?, ?, ?)`,
      [customerCode, dto.name, dto.phone, dto.email ?? null, dto.gender ?? null, dto.dob ?? null],
    );

    const rows = await this.db.query<ICustomer>(`SELECT * FROM customers WHERE customer_code = ?`, [customerCode]);
    return rows[0];
  }

  async findAll(search?: string): Promise<ICustomer[]> {
    if (search) {
      return this.db.query<ICustomer>(
        `SELECT * FROM customers WHERE status = 1 AND (name LIKE ? OR phone LIKE ? OR customer_code LIKE ?) ORDER BY name ASC`,
        [`%${search}%`, `%${search}%`, `%${search}%`],
      );
    }
    return this.db.query<ICustomer>(`SELECT * FROM customers WHERE status = 1 ORDER BY name ASC`);
  }

  async findOne(id: number): Promise<ICustomer> {
    const rows = await this.db.query<ICustomer>(`SELECT * FROM customers WHERE id = ? AND status = 1`, [id]);
    if (!rows.length) throw new NotFoundException(`Customer with id ${id} not found`);
    return rows[0];
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<ICustomer> {
    await this.findOne(id);

    if (dto.phone) {
      const clash = await this.db.query<{ id: number }>(
        `SELECT id FROM customers WHERE phone = ? AND id != ? AND status = 1`, [dto.phone, id],
      );
      if (clash.length) throw new ConflictException(`Phone number '${dto.phone}' is already registered`);
    }

    const fields: string[] = [];
    const params: (string | null)[] = [];

    if (dto.name !== undefined)   { fields.push('name = ?');   params.push(dto.name); }
    if (dto.phone !== undefined)  { fields.push('phone = ?');  params.push(dto.phone); }
    if (dto.email !== undefined)  { fields.push('email = ?');  params.push(dto.email); }
    if (dto.gender !== undefined) { fields.push('gender = ?'); params.push(dto.gender); }
    if (dto.dob !== undefined)    { fields.push('dob = ?');    params.push(dto.dob); }

    if (fields.length) {
      await this.db.execute(`UPDATE customers SET ${fields.join(', ')} WHERE id = ?`, [...params, String(id)]);
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id);
    await this.db.execute(`UPDATE customers SET status = 0 WHERE id = ?`, [id]);
    return { message: 'Customer deleted successfully' };
  }
}
