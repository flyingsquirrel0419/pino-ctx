import type { InternalAxiosRequestConfig } from 'axios';
import { describe, expect, it } from 'vitest';

import { createAxiosContextInterceptor } from '../src/axios';
import {
  extractTraceContext,
  injectTraceContextHeaders,
  parseTraceparentHeader,
  serializeTraceparentHeader
} from '../src/propagation';

describe('trace propagation helpers', () => {
  it('parses and serializes traceparent headers', () => {
    const traceparent = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';
    const parsed = parseTraceparentHeader(traceparent);

    expect(parsed).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      traceFlags: '01'
    });
    expect(serializeTraceparentHeader(parsed!)).toBe(traceparent);
  });

  it('extracts and injects trace context alongside request identifiers', () => {
    const traceContext = extractTraceContext({
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      tracestate: 'vendor=value',
      'x-request-id': 'req-1'
    });

    const headers = injectTraceContextHeaders({}, traceContext);

    expect(traceContext).toEqual({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      traceFlags: '01',
      tracestate: 'vendor=value',
      requestId: 'req-1'
    });
    expect(headers).toEqual({
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
      tracestate: 'vendor=value',
      'x-request-id': 'req-1'
    });
  });

  it('provides an axios interceptor for outgoing requests', () => {
    const interceptor = createAxiosContextInterceptor(() => ({
      requestId: 'req-axios',
      traceId: 'a'.repeat(32),
      spanId: 'b'.repeat(16),
      traceFlags: '01'
    }));

    const config = interceptor({
      headers: {
        authorization: 'Bearer token'
      }
    } as unknown as InternalAxiosRequestConfig);

    expect(config.headers).toMatchObject({
      authorization: 'Bearer token',
      traceparent: `00-${'a'.repeat(32)}-${'b'.repeat(16)}-01`,
      'x-request-id': 'req-axios'
    });
  });
});
