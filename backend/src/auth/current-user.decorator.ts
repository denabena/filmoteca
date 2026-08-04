import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { NeonAuthUser, RequestWithUser } from './neon-auth.guard';

/**
 * Reads the user that NeonAuthGuard attached to the request.
 *
 * Only usable on routes actually behind the guard. Without it there is no user
 * on the request and this returns undefined, which is why the return type is
 * non-optional: reaching a guarded handler means verification already passed.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): NeonAuthUser => {
    const request = context.switchToHttp().getRequest<RequestWithUser>();

    if (!request.user) {
      throw new Error(
        'CurrentUser used on a route without NeonAuthGuard. Add @UseGuards(NeonAuthGuard).',
      );
    }

    return request.user;
  },
);
