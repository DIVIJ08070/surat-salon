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
import { StylistLeaveService } from './stylist-leave.service';
import { CreateLeaveDto } from './dto/create-leave.dto';
import { Roles } from 'src/common/decorators/roles.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { UserRole } from 'src/common/enums';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import type { AuthUser } from 'src/auth/jwt.stratergy';

@ApiTags('Stylist Leaves')
@Controller('stylist-leaves')
@ApiBearerAuth()
export class StylistLeaveController {
  constructor(private readonly leaveService: StylistLeaveService) {}

  // POST /stylist-leaves  → Admin or Receptionist creates leave on behalf of stylist
  @Post()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.STYLIST)
  @ApiOperation({ summary: 'Submit a leave request' })
  create(@Body() dto: CreateLeaveDto): Promise<object> {
    return this.leaveService.create(dto);
  }

  // GET /stylist-leaves            → Admin sees all
  // GET /stylist-leaves?stylistId= → filter by stylist (Stylists use this to see own leaves)
  @Get()
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.STYLIST)
  @ApiOperation({ summary: 'Get all leave requests. Admin sees all; others filter by stylistId.' })
  @ApiQuery({ name: 'stylistId', required: false, description: 'Filter by stylist ID' })
  findAll(@Query('stylistId') stylistId?: string): Promise<object[]> {
    return this.leaveService.findAll(stylistId ? parseInt(stylistId, 10) : undefined);
  }

  // GET /stylist-leaves/:id
  @Get(':id')
  @ApiOperation({ summary: 'Get a single leave request by ID' })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<object> {
    return this.leaveService.findOne(id);
  }

  // PATCH /stylist-leaves/:id/approve  → Admin only
  @Patch(':id/approve')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve a leave request — blocks time slots (Admin only)' })
  approve(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.leaveService.approve(id);
  }

  // PATCH /stylist-leaves/:id/reject  → Admin only
  @Patch(':id/reject')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reject a leave request (Admin only)' })
  reject(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.leaveService.reject(id);
  }

  // PATCH /stylist-leaves/:id/revoke  → Admin only (undo an approved leave)
  @Patch(':id/revoke')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Revoke an approved leave — releases leave-blocked slots (Admin only)' })
  revoke(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.leaveService.revoke(id);
  }

  // DELETE /stylist-leaves/:id  → Stylist cancels own pending leave
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.STYLIST)
  @ApiOperation({ summary: 'Cancel a PENDING leave request' })
  cancel(@Param('id', ParseIntPipe) id: number): Promise<{ message: string }> {
    return this.leaveService.cancel(id);
  }
}
