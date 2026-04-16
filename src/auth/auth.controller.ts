import { Controller, Post, Body, HttpCode, HttpStatus, Res, Req, UnauthorizedException } from '@nestjs/common';
import type { Response, Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/Login.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ApiBearerAuth } from '@nestjs/swagger';

//source ~/.zshrc

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const tokens = await this.authService.login(loginDto);
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    return { accessToken: tokens.accessToken };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() logoutDto: LogoutDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;
    await this.authService.logout(logoutDto.accessToken, refreshToken);
    
    // Clear both the new backend cookie and the legacy frontend cookie on all possible paths
    res.clearCookie('refreshToken', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    
    return { message: 'Logged out successfully' };
  }

  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    console.log('--- Refresh Token Request Received ---');
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) {
      console.log('Refresh token missing from cookies');
      throw new UnauthorizedException('Refresh token missing from cookies');
    }
    const { accessToken } = await this.authService.refreshAccessToken(refreshToken);
    console.log('New Access Token generated successfully');
    return { accessToken };
  }
}
