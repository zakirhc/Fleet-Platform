import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/** Returns the authenticated user that the JWT guard attaches to the request. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext) =>
    context.switchToHttp().getRequest<{ user: unknown }>().user,
);
