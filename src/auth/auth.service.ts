import { Injectable, UnauthorizedException, ConflictException, InternalServerErrorException, HttpException } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { JwtService } from '@nestjs/jwt';
import { StringValue } from 'ms';
import * as bcrypt from 'bcrypt';
import { DatabaseService } from 'src/database/database.service';
import { UserService } from 'src/user/user.service';
import { LoginDto } from './dto/Login.dto';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { LogoutDto } from './dto/logout.dto';
import { IUser } from 'src/user/interfaces/user.interface';
import {
  INSERT_REFRESH_TOKEN,
  FIND_ACTIVE_REFRESH_TOKENS,
  FIND_ALL_REFRESH_TOKENS_BY_USER,
  REVOKE_REFRESH_TOKEN,
  INSERT_BLACKLISTED_TOKEN,
} from './auth.query';

interface RefreshTokenRow {
  id: number;
  token_hash: string;
  status: number;
}

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_DURATION_MINUTES = 15;

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
  ) { }

  // Generate access token

  private generateAccessToken(user: IUser): string {
    try {
      const jti = uuidv4();
      const payload = { sub: user.id, email: user.email, role: user.role, jti };
      return this.jwtService.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET || 'development_access_secret',
        expiresIn: (process.env.JWT_ACCESS_EXPIRATION || '1m') as StringValue,
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Generate refresh token

  private async generateRefreshToken(userId: number): Promise<string> {
    try {
      const rawToken = this.jwtService.sign({ sub: userId }, {
        secret: process.env.JWT_REFRESH_SECRET || 'development_refresh_secret',
        expiresIn: (process.env.JWT_REFRESH_EXPIRATION || '7d') as StringValue,
      });

      const tokenHash = await bcrypt.hash(rawToken, 10);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(process.env.JWT_REFRESH_EXPIRATION_DAYS || '7', 10));

      await this.db.execute(INSERT_REFRESH_TOKEN, [userId, tokenHash, expiresAt]);

      return rawToken;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Signup

  async signup(dto: CreateUserDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const existing = await this.userService.findWithSecretsByEmail(dto.email);
      if (existing) throw new ConflictException('User already exists');

      const newUser = await this.userService.create(dto);
      const accessToken = this.generateAccessToken(newUser);
      const refreshToken = await this.generateRefreshToken(newUser.id);
      return { accessToken, refreshToken };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Login

  async login(dto: LoginDto): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const user = await this.userService.findWithSecretsByEmail(dto.email);
      if (!user) throw new UnauthorizedException('No account found with that email');

      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        const remainingTime = Math.ceil(
          (new Date(user.locked_until).getTime() - Date.now()) / (1000 * 60),
        );
        throw new UnauthorizedException(`Account locked. Try again in ${remainingTime} minutes.`);
      }

      if (!user.password_hash) {
        throw new UnauthorizedException('Invalid user internal state');
      }

      const isPasswordValid = await bcrypt.compare(dto.password, user.password_hash);
      if (!isPasswordValid) {
        await this.handleFailedLogin(user);
        throw new UnauthorizedException('Incorrect password');
      }

      await this.userService.resetFailedAttempts(user.id);
      const accessToken = this.generateAccessToken(user);
      const refreshToken = await this.generateRefreshToken(user.id);
      return { accessToken, refreshToken };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Logout

  async logout(accessToken: string, refreshToken: string): Promise<void> {
    try {
      // Blacklist access token
      const decoded = this.jwtService.decode(accessToken) as { jti?: string; exp?: number } | null;
      if (decoded?.jti && decoded?.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          await this.db.execute(INSERT_BLACKLISTED_TOKEN, [decoded.jti, new Date(decoded.exp * 1000)]);
        }
      }

      // Revoke refresh token
      if (refreshToken) {
        const decodedRefresh = this.jwtService.decode(refreshToken) as { sub?: number } | null;
        if (decodedRefresh?.sub) {
          const activeTokens = await this.db.query<RefreshTokenRow>(FIND_ALL_REFRESH_TOKENS_BY_USER, [decodedRefresh.sub]);
          for (const token of activeTokens) {
            const isMatch = await bcrypt.compare(refreshToken, token.token_hash).catch(() => false);
            if (isMatch) {
              await this.db.execute(REVOKE_REFRESH_TOKEN, [token.id]);
              break;
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Refresh access token

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
    try {
      let decoded: { sub: number };
      try {
        decoded = this.jwtService.verify(refreshToken, {
          secret: process.env.JWT_REFRESH_SECRET || 'development_refresh_secret',
        }) as { sub: number };
      } catch {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const activeTokens = await this.db.query<RefreshTokenRow>(FIND_ACTIVE_REFRESH_TOKENS, [decoded.sub]);

      let isValidToken = false;
      for (const token of activeTokens) {
        const isMatch = await bcrypt.compare(refreshToken, token.token_hash).catch(() => false);
        if (isMatch) { 
          isValidToken = true; 
          console.log(`Refresh token match found in database for user ID: ${decoded.sub}`);
          break; 
        }
      }

      if (!isValidToken) throw new UnauthorizedException('Refresh token is inactive or logged out');

      const user = await this.userService.findWithSecretsById(decoded.sub);
      if (!user) throw new UnauthorizedException('User not found');

      return { accessToken: this.generateAccessToken(user) };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }

  // Failed login handler

  private async handleFailedLogin(user: IUser): Promise<void> {
    try {
      const newFailedAttempts = (user.failed_attempts ?? 0) + 1;
      
      // If they keep failing, we lock them out for a while (e.g., 15 minutes)
      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_DURATION_MINUTES);
        await this.userService.lockAccount(user.id, lockedUntil, newFailedAttempts);
      } else {
        await this.userService.incrementFailedAttempts(user.id, newFailedAttempts);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      throw new InternalServerErrorException(message);
    }
  }
}
