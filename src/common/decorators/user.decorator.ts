import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';
import { AuthUser } from 'src/auth/jwt.stratergy';

interface RequestWithUser extends Request {
  user?: AuthUser;
}

export const User = createParamDecorator(
  (data: keyof AuthUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();
    const user = request.user;

    // If a specific field is passed e.g. @User('user_id'), return just that field
    return data ? user?.[data] : user;
  },
);
