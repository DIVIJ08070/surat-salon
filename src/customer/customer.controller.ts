import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Customers')
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  // POST /customers  → ADMIN, RECEPTIONIST
  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Register a new customer (Admin / Receptionist)' })
  create(@Body() createCustomerDto: CreateCustomerDto) {
    return this.customerService.create(createCustomerDto);
  }

  // GET /customers?search=divij
  @Get()
  @ApiOperation({ summary: 'Get all customers, optional ?search= by name / phone / code' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by name, phone, or customer code' })
  findAll(@Query('search') search?: string) {
    return this.customerService.findAll(search);
  }

  // GET /customers/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single customer by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.findOne(id);
  }

  // PATCH /customers/:id  → ADMIN, RECEPTIONIST
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST)
  @ApiOperation({ summary: 'Update customer details (Admin / Receptionist)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateCustomerDto: UpdateCustomerDto,
  ) {
    return this.customerService.update(id, updateCustomerDto);
  }

  // DELETE /customers/:id  → ADMIN only (soft delete)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a customer (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.remove(id);
  }
}
