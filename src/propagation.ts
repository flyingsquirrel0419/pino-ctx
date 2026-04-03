import { getActiveTraceContext } from './telemetry';
import type { LogContext, TraceContext } from './types';

type HeaderValue = string | number | boolean | string[] | undefined | null;
type HeaderRecord = Record<string, HeaderValue>;

const TRACEPARENT_PATTERN =
  /^([a-f0-9]{2})-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/i;

function toHeaderRecord(headers?: Headers | HeaderRecord): Record<string, string> {
  if (!headers) {
    return {};
  }

  if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    return Object.fromEntries(headers.entries());
  }

  return Object.fromEntries(
    Object.entries(headers).flatMap(([key, value]) => {
      if (value == null) {
        return [];
      }

      if (Array.isArray(value)) {
        return [[key, value.join(',')]];
      }

      return [[key, String(value)]];
    })
  );
}

function findHeaderValue(
  headers: Headers | HeaderRecord | undefined,
  name: string
): string | undefined {
  const normalizedName = name.toLowerCase();

  for (const [key, value] of Object.entries(toHeaderRecord(headers))) {
    if (key.toLowerCase() === normalizedName) {
      return value;
    }
  }

  return undefined;
}

function getTraceContextFromContext(context: LogContext): TraceContext | null {
  const traceId = typeof context.traceId === 'string' ? context.traceId : undefined;
  const spanId = typeof context.spanId === 'string' ? context.spanId : undefined;

  if (!traceId || !spanId) {
    return null;
  }

  return {
    traceId,
    spanId,
    traceFlags:
      typeof context.traceFlags === 'string'
        ? context.traceFlags
        : typeof context.traceFlags === 'number'
          ? context.traceFlags.toString(16).padStart(2, '0')
          : '01',
    tracestate: typeof context.tracestate === 'string' ? context.tracestate : undefined
  };
}

export function parseTraceparentHeader(traceparent?: string | null): TraceContext | null {
  if (!traceparent) {
    return null;
  }

  const match = TRACEPARENT_PATTERN.exec(traceparent.trim());

  if (!match) {
    return null;
  }

  return {
    traceId: match[2].toLowerCase(),
    spanId: match[3].toLowerCase(),
    traceFlags: match[4].toLowerCase()
  };
}

export function serializeTraceparentHeader(traceContext: TraceContext): string {
  const traceFlags = (traceContext.traceFlags ?? '01').toLowerCase().padStart(2, '0');
  return `00-${traceContext.traceId.toLowerCase()}-${traceContext.spanId.toLowerCase()}-${traceFlags}`;
}

export function extractTraceContext(headers?: Headers | HeaderRecord): LogContext {
  const traceparent = findHeaderValue(headers, 'traceparent');
  const tracestate = findHeaderValue(headers, 'tracestate');
  const requestId = findHeaderValue(headers, 'x-request-id');
  const parsedTraceContext = parseTraceparentHeader(traceparent);

  return {
    ...(parsedTraceContext ?? {}),
    ...(tracestate ? { tracestate } : {}),
    ...(requestId ? { requestId } : {})
  };
}

export function injectTraceContextHeaders(
  headers?: Headers | HeaderRecord,
  context: LogContext = {}
): Record<string, string> {
  const nextHeaders = toHeaderRecord(headers);
  const traceContext = getTraceContextFromContext(context) ?? getActiveTraceContext();

  if (traceContext && !findHeaderValue(nextHeaders, 'traceparent')) {
    nextHeaders.traceparent = serializeTraceparentHeader(traceContext);
  }

  if (traceContext?.tracestate && !findHeaderValue(nextHeaders, 'tracestate')) {
    nextHeaders.tracestate = traceContext.tracestate;
  }

  if (typeof context.requestId === 'string' && !findHeaderValue(nextHeaders, 'x-request-id')) {
    nextHeaders['x-request-id'] = context.requestId;
  }

  return nextHeaders;
}
