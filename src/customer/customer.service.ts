import { ConflictException, Injectable, NotFoundException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { ICustomer } from './interfaces/customer.interface';
import {
  GENERATE_CUSTOMER_CODE,
  CHECK_CUSTOMER_PHONE_EXISTS,
  CHECK_CUSTOMER_PHONE_CONFLICT,
  INSERT_CUSTOMER,
  FIND_CUSTOMER_BY_CODE,
  FIND_ALL_CUSTOMERS,
  FIND_ALL_CUSTOMERS_SEARCH,
  FIND_CUSTOMER_BY_ID,
  UPDATE_CUSTOMER,
  DELETE_CUSTOMER,
} from './customer.query';

@Injectable()
export class CustomerService {
  constructor(private readonly db: DatabaseService) {}

  private async generateCustomerCode(): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const rows = await this.db.query<{ max_num: number | null }>(GENERATE_CUSTOMER_CODE(year));
      const maxNum = Number(rows[0]?.max_num ?? 0);
      return `CUST-${year}-${String(maxNum + 1).padStart(3, '0')}`;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async create(dto: CreateCustomerDto): Promise<ICustomer> {
    try {
      const existing = await this.db.query<{ id: number }>(CHECK_CUSTOMER_PHONE_EXISTS, [dto.phone]);
      if (existing.length) throw new ConflictException(`Phone number '${dto.phone}' is already registered`);

      const customerCode = await this.generateCustomerCode();

      await this.db.execute(INSERT_CUSTOMER, [
        customerCode,
        dto.name,
        dto.phone,
        dto.email ?? null,
        dto.gender ?? null,
        dto.dob ?? null,
      ]);

      const rows = await this.db.query<ICustomer>(FIND_CUSTOMER_BY_CODE, [customerCode]);
      return rows[0];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async findAll(search?: string): Promise<ICustomer[]> {
    try {
      if (search) {
        return this.db.query<ICustomer>(FIND_ALL_CUSTOMERS_SEARCH, [`%${search}%`, `%${search}%`, `%${search}%`]);
      }
      return this.db.query<ICustomer>(FIND_ALL_CUSTOMERS);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async findOne(id: number): Promise<ICustomer> {
    try {
      const rows = await this.db.query<ICustomer>(FIND_CUSTOMER_BY_ID, [id]);
      if (!rows.length) throw new NotFoundException(`Customer with id ${id} not found`);
      return rows[0];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async update(id: number, dto: UpdateCustomerDto): Promise<ICustomer> {
    try {
      await this.findOne(id);

      if (dto.phone) {
        const clash = await this.db.query<{ id: number }>(CHECK_CUSTOMER_PHONE_CONFLICT, [dto.phone, id]);
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
        await this.db.execute(UPDATE_CUSTOMER(fields), [...params, String(id)]);
      }
      return this.findOne(id);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  async remove(id: number): Promise<{ message: string }> {
    try {
      await this.findOne(id);
      await this.db.execute(DELETE_CUSTOMER, [id]);
      return { message: 'Customer deleted successfully' };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
