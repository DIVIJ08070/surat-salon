import { Controller, Get, Param, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, StylistSpecialisation } from '../common/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { StylistService } from '../stylist/stylist.service';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly stylistService: StylistService
  ) { }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users (Admin only)' })
  findAll() {
    return this.userService.findAll();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  async create(@Body() dto: CreateUserDto) {
    const newUser = await this.userService.create(dto);

    // Automation: If role is stylist, create an automatic profile
    if (newUser.role === UserRole.STYLIST) {
      const details = {
        specialisation: dto.stylistDetails?.specialisation || StylistSpecialisation.HAIR_STYLIST,
        workingDays: dto.stylistDetails?.workingDays || 'Mon,Tue,Wed,Thu,Fri',
        shiftStart: dto.stylistDetails?.shiftStart || '09:00:00',
        shiftEnd: dto.stylistDetails?.shiftEnd || '18:00:00',
        commissionRate: dto.stylistDetails?.commissionRate || 0,
      };

      await this.stylistService.create({
        name: newUser.name,
        ...details
      } as any, UserRole.ADMIN, newUser.id);
    }

    return newUser;
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STYLIST)
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string) {
    return this.userService.findById(+id);
  }
}
