import { Controller, Get, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';


@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  @Roles(UserRole.STYLIST)
  findOne(@Param('id') id: string) {
    return this.userService.findById(+id);
  }
}
