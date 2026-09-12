import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { PublicUser } from './auth.types.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser => {
    const request = context.switchToHttp().getRequest<{ user: PublicUser }>();
    return request.user;
  },
);
