import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response, NextFunction } from 'express';
import { DatabaseService } from 'src/database/database.service';
import { AuthUser } from 'src/auth/jwt.stratergy';

interface JwtPayload {
  sub: number;
  email: string;
  role: string;
  jti: string;
}

interface RequestWithUser extends Request {
  user?: AuthUser;
}

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly db: DatabaseService,
  ) {}

  async use(req: RequestWithUser, _res: Response, next: NextFunction): Promise<void> {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No token provided');
    }

    const token = authHeader.split(' ')[1];

    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET || 'development_access_secret',
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }

    const result = await this.db.query<{ id: number }>(
      `SELECT id FROM token_blacklist WHERE jti = ? LIMIT 1`,
      [payload.jti],
    );

    if (result.length > 0) {
      throw new UnauthorizedException('Token has been revoked');
    }

    req.user = {
      user_id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    next();
  }
}
