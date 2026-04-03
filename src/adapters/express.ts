import type { NextFunction, Request, RequestHandler, Response } from 'express';

import { extractTraceContext } from '../propagation';
import { defaultContextStore } from '../store';
import type { ExpressContextOptions, LogContext } from '../types';

function defaultExtractContext(request: Request): LogContext {
  const requestIdHeader = request.header('x-request-id');
  const requestWithId = request as Request & { id?: string };

  return {
    ...extractTraceContext(request.headers as Record<string, string | string[] | undefined>),
    ...(requestIdHeader || requestWithId.id ? { requestId: requestIdHeader ?? requestWithId.id } : {}),
    method: request.method,
    path: request.path || request.originalUrl || request.url
  };
}

export function createExpressMiddleware(
  options: ExpressContextOptions<Request, Response> = {}
): RequestHandler {
  const store = options.store ?? defaultContextStore;
  const extractContext = options.extractContext ?? ((request: Request) => defaultExtractContext(request));

  return (request: Request, response: Response, next: NextFunction): void => {
    try {
      store.withContext(extractContext(request, response), () => next());
    } catch (error) {
      next(error);
    }
  };
}

export const pinoCTXMiddleware = createExpressMiddleware;
