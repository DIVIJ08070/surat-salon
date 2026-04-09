import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from 'src/database/database.service';
import { CreateBillDto, PayBillDto } from './dto/bill.dto';
import { IBill } from './interfaces/bill.interface';
import { AppointmentStatus, BillStatus } from 'src/common/enums';

// ─── Full bill row (joined with appointment, customer, stylist) ───────────────
interface BillDetailRow extends IBill {
  appointment_number: string;
  appointment_date: string;
  start_time: string;
  customer_name: string;
  customer_phone: string;
  customer_code: string;
  stylist_name: string;
}

const BILL_SELECT = `
  SELECT b.id, b.bill_number, b.subtotal, b.discount, b.tax, b.total,
         b.payment_method, b.bill_status, b.paid_at, b.created_at,
         a.appointment_number, a.appointment_date, a.start_time,
         c.name AS customer_name, c.phone AS customer_phone, c.customer_code,
         st.name AS stylist_name
  FROM bills b
  JOIN appointments a ON a.id = b.appointment_id
  JOIN customers c ON c.id = a.customer_id
  JOIN stylists st ON st.id = a.stylist_id
`;

@Injectable()
export class BillService {
  constructor(private readonly db: DatabaseService) {}

  // ─── AUTO-GENERATE BILL NUMBER (BILL-YYYY-NNN) ────────────────────────────────

  private async generateBillNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const rows = await this.db.query<{ max_num: number | null }>(
      `SELECT MAX(CAST(SUBSTRING_INDEX(bill_number, '-', -1) AS UNSIGNED)) AS max_num
       FROM bills WHERE bill_number REGEXP '^BILL-${year}-[0-9]+$'`,
    );
    const maxNum = Number(rows[0]?.max_num ?? 0);
    return `BILL-${year}-${String(maxNum + 1).padStart(3, '0')}`;
  }

  // ─── CREATE BILL ──────────────────────────────────────────────────────────────

  async create(dto: CreateBillDto): Promise<BillDetailRow> {
    const aptRows = await this.db.query<{ id: number; appointment_status: string; total_amount: number }>(
      `SELECT id, appointment_status, total_amount FROM appointments WHERE id = ? AND status = 1`,
      [dto.appointmentId],
    );
    if (!aptRows.length) throw new NotFoundException(`Appointment with id ${dto.appointmentId} not found`);
    if (aptRows[0].appointment_status !== AppointmentStatus.COMPLETED) {
      throw new BadRequestException(
        `Bill can only be generated for COMPLETED appointments. Current status: ${aptRows[0].appointment_status}`,
      );
    }

    const existing = await this.db.query<{ id: number }>(
      `SELECT id FROM bills WHERE appointment_id = ? AND status = 1`, [dto.appointmentId],
    );
    if (existing.length) throw new ConflictException(`A bill already exists for appointment ${dto.appointmentId}`);

    const subtotal = Number(aptRows[0].total_amount);
    const discount = dto.discount ?? 0;
    const tax = dto.tax ?? 0;
    const total = subtotal - discount + tax;

    if (total < 0) throw new BadRequestException('Discount cannot exceed the subtotal amount');

    const billNumber = await this.generateBillNumber();

    await this.db.execute(
      `INSERT INTO bills (appointment_id, bill_number, subtotal, discount, tax, total, bill_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [dto.appointmentId, billNumber, subtotal, discount, tax, total, BillStatus.PENDING],
    );

    const rows = await this.db.query<BillDetailRow>(`${BILL_SELECT} WHERE b.bill_number = ?`, [billNumber]);
    return rows[0];
  }

  // ─── PAY A BILL ───────────────────────────────────────────────────────────────

  async pay(id: number, dto: PayBillDto): Promise<BillDetailRow> {
    const bill = await this.findOne(id);
    if (bill.bill_status === BillStatus.PAID) throw new BadRequestException('Bill is already paid');
    if (bill.bill_status === BillStatus.REFUNDED) throw new BadRequestException('Cannot pay a refunded bill');

    await this.db.execute(
      `UPDATE bills SET bill_status = ?, payment_method = ?, paid_at = NOW() WHERE id = ?`,
      [BillStatus.PAID, dto.paymentMethod, id],
    );
    return this.findOne(id);
  }

  // ─── REFUND A BILL ────────────────────────────────────────────────────────────

  async refund(id: number): Promise<{ message: string }> {
    const bill = await this.findOne(id);
    if (bill.bill_status !== BillStatus.PAID) throw new BadRequestException('Only PAID bills can be refunded');
    await this.db.execute(`UPDATE bills SET bill_status = ? WHERE id = ?`, [BillStatus.REFUNDED, id]);
    return { message: 'Bill refunded successfully' };
  }

  // ─── GET BILL BY ID ───────────────────────────────────────────────────────────

  async findOne(id: number): Promise<BillDetailRow> {
    const rows = await this.db.query<BillDetailRow>(`${BILL_SELECT} WHERE b.id = ? AND b.status = 1`, [id]);
    if (!rows.length) throw new NotFoundException(`Bill with id ${id} not found`);
    return rows[0];
  }

  // ─── GET BILL BY APPOINTMENT ID ───────────────────────────────────────────────

  async findByAppointment(appointmentId: number): Promise<BillDetailRow> {
    const rows = await this.db.query<BillDetailRow>(`${BILL_SELECT} WHERE b.appointment_id = ? AND b.status = 1`, [appointmentId]);
    if (!rows.length) throw new NotFoundException(`No bill found for appointment ${appointmentId}`);
    return rows[0];
  }

  // ─── LIST ALL BILLS ───────────────────────────────────────────────────────────

  async findAll(filters: {
    billStatus?: BillStatus;
    page?: number;
    limit?: number;
  }): Promise<{ data: BillDetailRow[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 10;
    const offset = (page - 1) * limit;
    const params: (string | number)[] = [];
    let whereSql = `WHERE b.status = 1`;

    if (filters.billStatus) { whereSql += ` AND b.bill_status = ?`; params.push(filters.billStatus); }

    const countRows = await this.db.query<{ total: string }>(`SELECT COUNT(*) AS total FROM bills b ${whereSql}`, params);
    const total = parseInt(countRows[0].total, 10);

    const data = await this.db.query<BillDetailRow>(
      `SELECT b.id, b.bill_number, b.subtotal, b.discount, b.tax, b.total,
              b.payment_method, b.bill_status, b.paid_at, b.created_at,
              a.appointment_number, a.appointment_date,
              c.name AS customer_name, c.customer_code,
              st.name AS stylist_name
       FROM bills b
       JOIN appointments a ON a.id = b.appointment_id
       JOIN customers c ON c.id = a.customer_id
       JOIN stylists st ON st.id = a.stylist_id
       ${whereSql} ORDER BY b.created_at DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }
}
