import { createRequire } from 'node:module';

import type { LogContext, TraceContext } from './types';

const INVALID_TRACE_ID = /^0{32}$/;
const INVALID_SPAN_ID = /^0{16}$/;
const require = createRequire(`${process.cwd()}/package.json`);

type OpenTelemetryApi = typeof import('@opentelemetry/api');

let cachedOpenTelemetryApi: OpenTelemetryApi | null | undefined;

function loadOpenTelemetryApi(): OpenTelemetryApi | null {
  if (cachedOpenTelemetryApi !== undefined) {
    return cachedOpenTelemetryApi;
  }

  try {
    cachedOpenTelemetryApi = require('@opentelemetry/api') as OpenTelemetryApi;
    return cachedOpenTelemetryApi;
  } catch (error) {
    if (
      error instanceof Error &&
      'code' in error &&
      (error.code === 'MODULE_NOT_FOUND' || error.code === 'ERR_MODULE_NOT_FOUND')
    ) {
      cachedOpenTelemetryApi = null;
      return null;
    }

    throw error;
  }
}

export function getActiveTraceContext(): TraceContext | null {
  const otelApi = loadOpenTelemetryApi();

  if (!otelApi) {
    return null;
  }

  const span = otelApi.trace.getSpan(otelApi.context.active());

  if (!span) {
    return null;
  }

  const spanContext = span.spanContext();

  if (INVALID_TRACE_ID.test(spanContext.traceId) || INVALID_SPAN_ID.test(spanContext.spanId)) {
    return null;
  }

  return {
    traceId: spanContext.traceId,
    spanId: spanContext.spanId,
    traceFlags: spanContext.traceFlags.toString(16).padStart(2, '0'),
    tracestate: spanContext.traceState?.serialize()
  };
}

export function getOpenTelemetryContext(): LogContext {
  const traceContext = getActiveTraceContext();

  if (!traceContext) {
    return {};
  }

  return {
    traceId: traceContext.traceId,
    spanId: traceContext.spanId,
    traceFlags: traceContext.traceFlags,
    ...(traceContext.tracestate ? { tracestate: traceContext.tracestate } : {})
  };
}
