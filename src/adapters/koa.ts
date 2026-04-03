import type Koa from 'koa';

import { extractTraceContext } from '../propagation';
import { defaultContextStore } from '../store';
import type { KoaContextOptions, LogContext } from '../types';

function defaultExtractContext(context: Koa.Context): LogContext {
  const requestId = context.get('x-request-id');

  return {
    ...extractTraceContext(context.request.headers as Record<string, string | string[] | undefined>),
    ...(requestId ? { requestId } : {}),
    method: context.method,
    path: context.path
  };
}

export function createKoaMiddleware(
  options: KoaContextOptions<Koa.Context> = {}
): Koa.Middleware {
  const store = options.store ?? defaultContextStore;
  const extractContext = options.extractContext ?? ((context: Koa.Context) => defaultExtractContext(context));

  return async (context, next) => store.withContext(extractContext(context), () => next());
}
