import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/Login.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { User, RefreshToken, TokenBlacklist } from 'src/entities';
import { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { UserService } from 'src/user/user.service';

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
    constructor(
      private readonly userService: UserService,
      private readonly jwtService: JwtService,
      @InjectRepository(RefreshToken)
      private readonly refreshTokenRepository: Repository<RefreshToken>,
      @InjectRepository(TokenBlacklist)
      private readonly tokenBlacklistRepository: Repository<TokenBlacklist>,
    ) {}

    private generateAccessToken(user: User):string {
    const jti = uuidv4();
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti,
    };
    const token = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET || 'development_access_secret',
      expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '15m') as StringValue,
    });
    return token;
  }

    private async generateRefreshToken(id: number){
      const rawtoken = this.jwtService.sign({ sub: id }, {
        secret: process.env.JWT_REFRESH_SECRET || 'development_refresh_secret',
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as StringValue,
      });
      const token = await bcrypt.hash(rawtoken, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS || '7', 10));
      const refreshToken = this.refreshTokenRepository.create({
        tokenHash: token,
        expiresAt,
        user: { id },
      });
      await this.refreshTokenRepository.save(refreshToken); 
      return rawtoken;
    }   

    async signup(createUserDto: CreateUserDto){
      try{
          const user = await this.userService.findByEmail(createUserDto.email);
          if(user){
            throw new ConflictException('User already exists');
          }
          const newUser = await this.userService.create(createUserDto);
          const accessToken = this.generateAccessToken(newUser);
          const refreshToken = await this.generateRefreshToken(newUser.id);
          return { accessToken, refreshToken };
        
      }catch(error){
        throw error;
      }
    }

    async login(loginDto: LoginDto) {
      try {
        const user = await this.userService.findByEmail(loginDto.email);
        if (!user) {
          throw new UnauthorizedException('User not found');
        }
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          const remainingTime = Math.ceil(
            (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
          );
          throw new UnauthorizedException(`Account locked. Try again in ${remainingTime} minutes.`);
        }
        const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
        if (!isPasswordValid) {
          await this.handleFailedLogin(user);
          throw new UnauthorizedException('Invalid credentials');
        }
        await this.userService.resetFailedAttempts(user.id);
        const accessToken = this.generateAccessToken(user);
        const refreshToken = await this.generateRefreshToken(user.id);
        return { accessToken, refreshToken };
      } catch (error) {
        throw error;
      }
    }
  

  private async blacklistAccessToken(accessToken: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(accessToken) as {
        jti?: string;
        exp?: number;
      } | null;

      if (decoded?.jti && decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.tokenBlacklistRepository.save({
            jti: decoded.jti,
            expiresAt: new Date(decoded.exp * 1000),
          });
        }
      }
    } catch {
      // silently ignore decode errors
    }
  }
  async logout(accessToken: string, refreshToken: string): Promise<void> {
    await this.blacklistAccessToken(accessToken);
    if (refreshToken) {
      const decoded = this.jwtService.decode(refreshToken) as { sub?: number } | null;
      if (decoded?.sub) {
        const activeTokens = await this.refreshTokenRepository.query(
          'SELECT * FROM refresh_tokens WHERE user_id = ?',
          [decoded.sub]
        );
        for (const token of activeTokens) {
          const isMatch = await bcrypt.compare(refreshToken, token.token_hash).catch(() => false);
          if (isMatch) {
            await this.refreshTokenRepository.query(
              'UPDATE refresh_tokens SET status = 0, is_revoked = 1 WHERE id = ?',
              [token.id]
            );
            break;
          }
        }
      }
    }
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      const decoded = this.jwtService.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'development_refresh_secret',
      });

      const activeTokens = await this.refreshTokenRepository.query(
        'SELECT * FROM refresh_tokens WHERE user_id = ? AND status = 1 AND is_revoked = 0',
        [decoded.sub]
      );

      let isValidToken = false;
      for (const token of activeTokens) {
        const isMatch = await bcrypt.compare(refreshToken, token.token_hash).catch(() => false);
        if (isMatch) {
          isValidToken = true;
          break;
        }
      }

      if (!isValidToken) {
        throw new UnauthorizedException('Refresh token is inactive or logged out');
      }

      const user = await this.userService.findById(decoded.sub);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }
      const accessToken = this.generateAccessToken(user);
      return { accessToken };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async handleFailedLogin(user: User): Promise<void> {
    const newFailedAttempts = user.failedAttempts + 1;

    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      const lockedUntil = new Date();
      lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_DURATION_MINUTES);
      await this.userService.lockAccount(
        user.id,
        lockedUntil,
        newFailedAttempts,
      );
    } else {
      await this.userService.incrementFailedAttempts(
        user.id,
        user.failedAttempts,
      );
    }
  }
}


