import type { DestinationStream, Logger, LoggerOptions } from 'pino';

export type LogContext = Record<string, unknown>;

export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags?: string;
  tracestate?: string;
}

export interface ContextStore {
  setContext: (context: LogContext) => void;
  getContext: () => LogContext;
  withContext: <T>(context: LogContext, fn: () => T) => T;
  clearContext: () => void;
}

export interface ContextLoggerOptions extends LoggerOptions {
  destination?: DestinationStream;
  includeOpenTelemetryContext?: boolean;
  store?: ContextStore;
}

export interface ContextLoggerInstance {
  logger: Logger;
  setContext: ContextStore['setContext'];
  getContext: ContextStore['getContext'];
  withContext: ContextStore['withContext'];
  clearContext: ContextStore['clearContext'];
  getLogContext: () => LogContext;
}

export interface ExpressContextOptions<TRequest, TResponse> {
  extractContext?: (request: TRequest, response: TResponse) => LogContext;
  store?: ContextStore;
}

export interface FastifyContextOptions<TRequest, TReply> {
  extractContext?: (request: TRequest, reply: TReply) => LogContext;
  store?: ContextStore;
}

export interface KoaContextOptions<TContext> {
  extractContext?: (context: TContext) => LogContext;
  store?: ContextStore;
}

export interface HonoContextOptions<TContext> {
  extractContext?: (context: TContext) => LogContext;
  store?: ContextStore;
}
