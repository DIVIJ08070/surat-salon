import { ApiProperty } from '@nestjs/swagger';

export class ApiResponse<T> {
  @ApiProperty({ description: 'Indicates if the request was successful' })
  success!: boolean;

  @ApiProperty({ description: 'Return data payload' })
  data?: T;

  @ApiProperty({ description: 'Error message if any' })
  message?: string;

  @ApiProperty({ description: 'Timestamp of the response' })
  timestamp!: string;

  @ApiProperty({ description: 'Pagination total if available' })
  total?: number;

  @ApiProperty({ description: 'Pagination current page if available' })
  page?: number;

  @ApiProperty({ description: 'Pagination per page limit if available' })
  limit?: number;

  constructor(partial: Partial<ApiResponse<T>>) {
    Object.assign(this, partial);
    this.timestamp = new Date().toISOString();
  }
}
