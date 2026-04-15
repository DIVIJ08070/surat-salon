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
  Version,
} from '@nestjs/common';
import { StylistService } from './stylist.service';
import { CreateStylistDto } from './dto/create-stylist.dto';
import { UpdateStylistDto } from './dto/update-stylist.dto';
import { GetStylistsFilterDto } from './dto/get-stylists-filter.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { UserRole, StylistSpecialisation, StylistStatus } from 'src/common/enums';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import type { AuthUser } from 'src/auth/jwt.stratergy';
import { AssignServicesDto } from './dto/assign-services.dto';

@ApiTags('Stylists')
@ApiBearerAuth()
@Controller('stylists')
export class StylistController {
  constructor(private readonly stylistService: StylistService) {}

  // GET /stylists/me/profile -> current logged-in stylist
  @Get('me/profile')
  @ApiOperation({ summary: 'Get current stylist profile' })
  getMyProfile(@User() user: any) {
    return this.stylistService.findByUserId(user.user_id);
  }

  // POST /stylists  → ADMIN only
  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Add a new stylist (Admin only)' })
  create(@Body() createStylistDto: CreateStylistDto, @User() user: any) {
    return this.stylistService.create(createStylistDto, user.role as UserRole);
  }

  // GET /stylists?specialisation=hair_stylist&stylistStatus=active&page=1&limit=10
  @Get()
  @ApiOperation({ summary: 'Get all stylists with filters and pagination' })
  findAll(
    @User() user: AuthUser,
    @Query() query: GetStylistsFilterDto,
  ) {
    return this.stylistService.findAll(
      user.role as UserRole,
      query.specialisation,
      query.stylistStatus,
      query.page,
      query.limit,
      query.serviceIds,
    );
  }

  // GET /stylists/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single stylist by ID' })
  findOne(@Param('id', ParseIntPipe) id: number, @User() user: AuthUser) {
    return this.stylistService.findOne(id, user.role as UserRole);
  }

  // PATCH /stylists/:id  → ADMIN only
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a stylist (Admin only)' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStylistDto: UpdateStylistDto,
    @User() user: AuthUser,
  ) {
    return this.stylistService.update(id, updateStylistDto, user.role as UserRole);
  }

  // DELETE /stylists/:id  → ADMIN only (soft delete)
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft-delete a stylist (Admin only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.stylistService.remove(id);
  }

  // ─── STYLIST ↔ SERVICE ASSIGNMENT ────────────────────────────────────────────

  // POST /stylists/:id/services  → ADMIN only
  @Post(':id/services')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign services to a stylist (Admin only)' })
  assignServices(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignServicesDto,
  ) {
    return this.stylistService.assignServices(id, dto);
  }

  // GET /stylists/:id/services  → all authenticated users
  @Get(':id/services')
  @ApiOperation({ summary: 'Get all services a stylist can perform' })
  getStylistServices(@Param('id', ParseIntPipe) id: number) {
    return this.stylistService.getStylistServices(id);
  }

  // DELETE /stylists/:id/services/:serviceId  → ADMIN only
  @Delete(':id/services/:serviceId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Remove a service from a stylist (Admin only)' })
  removeService(
    @Param('id', ParseIntPipe) id: number,
    @Param('serviceId', ParseIntPipe) serviceId: number,
  ) {
    return this.stylistService.removeService(id, serviceId);
  }
}
