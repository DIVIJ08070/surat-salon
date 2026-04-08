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
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';

@ApiTags('Services')
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

  // GET /services?category=hair&gender=female  → all authenticated users
  @Get()
  @ApiOperation({ summary: 'Get all active services (optional filters: category, gender)' })
  @ApiQuery({ name: 'category', enum: ServiceCategory, required: false })
  @ApiQuery({ name: 'gender', enum: Gender, required: false })
  findAll(
    @Query('category') category?: ServiceCategory,
    @Query('gender') gender?: Gender,
  ) {
    return this.serviceService.findAll(category, gender);
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
