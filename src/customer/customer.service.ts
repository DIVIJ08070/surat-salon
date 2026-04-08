import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Customer } from 'src/entities';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer)
    private readonly customerRepository: Repository<Customer>,
  ) {}

  // ─── AUTO-GENERATE CUSTOMER CODE ──────────────────────────────────────────────
  // Format: CUST-YYYY-NNN (e.g. CUST-2025-001), sequence resets every year
  private async generateCustomerCode(): Promise<string> {
    const year = new Date().getFullYear(); // e.g. 2025

    const rows: { customer_code: string }[] = await this.customerRepository.query(
      `SELECT customer_code FROM customers
       WHERE customer_code LIKE ?
       ORDER BY id DESC LIMIT 1`,
      [`CUST-${year}-%`],
    );

    if (!rows || rows.length === 0) {
      return `CUST-${year}-001`;
    }

    // e.g. "CUST-2025-007" → split → "007" → 7
    const lastCode = rows[0].customer_code;
    const num = parseInt(lastCode.split('-')[2], 10);
    const next = num + 1;
    return `CUST-${year}-${String(next).padStart(3, '0')}`;
  }

  // ─── CREATE ──────────────────────────────────────────────────────────────────

  async create(dto: CreateCustomerDto): Promise<object> {
    // Check phone uniqueness
    const existing: object[] = await this.customerRepository.query(
      `SELECT id FROM customers WHERE phone = ? AND status = 1`,
      [dto.phone],
    );
    if (existing.length > 0) {
      throw new ConflictException(`Phone number '${dto.phone}' is already registered`);
    }

    const customerCode = await this.generateCustomerCode();
    const email = dto.email ?? null;
    const gender = dto.gender ?? null;
    const dob = dto.dob ?? null;

    await this.customerRepository.query(
      `INSERT INTO customers (customer_code, name, phone, email, gender, dob)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [customerCode, dto.name, dto.phone, email, gender, dob],
    );

    const rows: object[] = await this.customerRepository.query(
      `SELECT * FROM customers WHERE customer_code = ?`,
      [customerCode],
    );

    return rows[0];
  }

  // ─── READ ALL ─────────────────────────────────────────────────────────────────

  async findAll(search?: string): Promise<object[]> {
    if (search) {
      return this.customerRepository.query(
        `SELECT * FROM customers
         WHERE status = 1
           AND (name LIKE ? OR phone LIKE ? OR customer_code LIKE ?)
         ORDER BY name ASC`,
        [`%${search}%`, `%${search}%`, `%${search}%`],
      );
    }

    return this.customerRepository.query(
      `SELECT * FROM customers WHERE status = 1 ORDER BY name ASC`,
    );
  }

  // ─── READ ONE ─────────────────────────────────────────────────────────────────

  async findOne(id: number): Promise<object> {
    const rows: object[] = await this.customerRepository.query(
      `SELECT * FROM customers WHERE id = ? AND status = 1`,
      [id],
    );

    if (!rows || rows.length === 0) {
      throw new NotFoundException(`Customer with id ${id} not found`);
    }

    return rows[0];
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────────

  async update(id: number, dto: UpdateCustomerDto): Promise<object> {
    await this.findOne(id); // throws 404 if not found

    // If phone is being updated, check uniqueness against other customers
    if (dto.phone) {
      const clash: object[] = await this.customerRepository.query(
        `SELECT id FROM customers WHERE phone = ? AND id != ? AND status = 1`,
        [dto.phone, id],
      );
      if (clash.length > 0) {
        throw new ConflictException(`Phone number '${dto.phone}' is already registered`);
      }
    }

    const fields: string[] = [];
    const params: (string | null)[] = [];

    if (dto.name !== undefined) {
      fields.push('name = ?');
      params.push(dto.name);
    }
    if (dto.phone !== undefined) {
      fields.push('phone = ?');
      params.push(dto.phone);
    }
    if (dto.email !== undefined) {
      fields.push('email = ?');
      params.push(dto.email);
    }
    if (dto.gender !== undefined) {
      fields.push('gender = ?');
      params.push(dto.gender);
    }
    if (dto.dob !== undefined) {
      fields.push('dob = ?');
      params.push(dto.dob);
    }

    if (fields.length === 0) {
      return this.findOne(id);
    }

    params.push(String(id));
    await this.customerRepository.query(
      `UPDATE customers SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );

    return this.findOne(id);
  }

  // ─── SOFT DELETE ──────────────────────────────────────────────────────────────

  async remove(id: number): Promise<{ message: string }> {
    await this.findOne(id); // throws 404 if not found

    await this.customerRepository.query(
      `UPDATE customers SET status = 127 WHERE id = ?`,
      [id],
    );

    return { message: 'Customer deleted successfully' };
  }
}
