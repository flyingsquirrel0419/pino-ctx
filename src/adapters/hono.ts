import type { Context, MiddlewareHandler } from 'hono';

import { extractTraceContext } from '../propagation';
import { defaultContextStore } from '../store';
import type { HonoContextOptions, LogContext } from '../types';

function defaultExtractContext(context: Context): LogContext {
  const requestId = context.req.header('x-request-id');

  return {
    ...extractTraceContext(Object.fromEntries(context.req.raw.headers.entries())),
    ...(requestId ? { requestId } : {}),
    method: context.req.method,
    path: context.req.path
  };
}

export function createHonoMiddleware(
  options: HonoContextOptions<Context> = {}
): MiddlewareHandler {
  const store = options.store ?? defaultContextStore;
  const extractContext = options.extractContext ?? ((context: Context) => defaultExtractContext(context));

  return async (context, next) => store.withContext(extractContext(context), () => next());
}
