import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ServiceService } from './service.service';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole, ServiceCategory, Gender } from 'src/common/enums';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Services')
@ApiBearerAuth()
@Controller('services')
export class ServiceController {
  constructor(private readonly serviceService: ServiceService) {}

  // POST /services  → ADMIN only
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new salon service (Admin only)' })
  create(@Body() createServiceDto: CreateServiceDto) {
    return this.serviceService.create(createServiceDto);
  }

  // GET /services?category=hair&gender=female&page=1&limit=10
  @Get()
  @ApiOperation({ summary: 'Get all active services with pagination (default: 10 per page)' })
  @ApiQuery({ name: 'category', enum: ServiceCategory, required: false })
  @ApiQuery({ name: 'gender', enum: Gender, required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  findAll(
    @Query('category') category?: ServiceCategory,
    @Query('gender') gender?: Gender,
    @Query() pagination?: PaginationDto,
  ) {
    const page = pagination?.page ?? 1;
    const limit = pagination?.limit ?? 10;
    return this.serviceService.findAll(category, gender, page, limit);
  }

  // GET /services/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single service by ID' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.serviceService.findOne(id);
  }

  // PATCH /services/:id  → ADMIN only
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a service (Admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateServiceDto: UpdateServiceDto,
  ) {
    return this.serviceService.update(id, updateServiceDto);
  }

  // PATCH /services/:id/toggle-availability  → ADMIN only
  @Patch(':id/toggle-availability')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Toggle service availability on/off (Admin only)' })
  toggleAvailability(@Param('id', ParseIntPipe) id: number) {
    return this.serviceService.toggleAvailability(id);
  }

  // DELETE /services/:id  → ADMIN only (soft delete)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a service (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.serviceService.remove(id);
  }
}
