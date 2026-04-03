import { createContextLogger } from './createContextLogger';

const defaultContextLogger = createContextLogger();

export const logger = defaultContextLogger.logger;
export const setContext = defaultContextLogger.setContext;
export const getContext = defaultContextLogger.getContext;
export const withContext = defaultContextLogger.withContext;
export const clearContext = defaultContextLogger.clearContext;
export const getLogContext = defaultContextLogger.getLogContext;

export { createAxiosContextInterceptor } from './axios';
export { createContextLogger } from './createContextLogger';
export { injectTraceContextHeaders, extractTraceContext, parseTraceparentHeader, serializeTraceparentHeader } from './propagation';
export { createContextStore, defaultContextStore } from './store';
export { getActiveTraceContext, getOpenTelemetryContext } from './telemetry';

export { createExpressMiddleware, pinoCTXMiddleware } from './adapters/express';
export { pinoCTXPlugin } from './adapters/fastify';
export { createHonoMiddleware } from './adapters/hono';
export { createKoaMiddleware } from './adapters/koa';

export type * from './types';
