import { Injectable, OnModuleDestroy, OnModuleInit, Logger, InternalServerErrorException, HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPool, Pool, PoolConnection, ResultSetHeader } from 'mysql2/promise';

// mysql2 accepts these as parameter values
type SqlParam = string | number | boolean | null | Date;

@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  private readonly logger = new Logger(DatabaseService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    this.pool = createPool({
      host:     this.configService.get<string>('DB_HOST',     'localhost'),
      port:     this.configService.get<number>('DB_PORT',     3306),
      user:     this.configService.get<string>('DB_USERNAME', 'root'),
      password: this.configService.get<string>('DB_PASSWORD', ''),
      database: this.configService.get<string>('DB_NAME',     'surat_salon'),
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
    this.logger.log('MySQL connection pool created');
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
    this.logger.log('MySQL connection pool closed');
  }

  // SELECT (returns rows)
  async query<T = Record<string, SqlParam>>(
    sql: string,
    params: SqlParam[] = [],
  ): Promise<T[]> {
    try {
      // Use query (text protocol) instead of execute (binary/prepared) because 
      // mysql2 prepared statements reject LIMIT/OFFSET as bound parameters
      const [rows] = await this.pool.query(sql, params);
      return rows as T[];
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // INSERT / UPDATE / DELETE
  async execute(sql: string, params: SqlParam[] = []): Promise<ResultSetHeader> {
    try {
      const [result] = await this.pool.execute(sql, params);
      return result as ResultSetHeader;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Get connection for transactions
  async getConnection(): Promise<PoolConnection> {
    try {
      return this.pool.getConnection();
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
