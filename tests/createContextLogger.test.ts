import { context as otelContext, trace, type Span } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createBufferedLogger } from './helpers';

const otelContextManager = new AsyncLocalStorageContextManager();

beforeAll(() => {
  otelContext.setGlobalContextManager(otelContextManager.enable());
});

afterAll(() => {
  otelContextManager.disable();
});

describe('createContextLogger', () => {
  it('injects the active context into every log call', async () => {
    const contextLogger = createBufferedLogger();

    await contextLogger.withContext({ requestId: 'req-1', userId: 'user-1' }, async () => {
      contextLogger.logger.info('processing order');
      await contextLogger.withContext({ step: 'payment' }, async () => {
        contextLogger.logger.info({ orderId: 'ord-1' }, 'charging card');
      });
    });

    const logs = await contextLogger.readLogs();

    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({
      msg: 'processing order',
      requestId: 'req-1',
      userId: 'user-1'
    });
    expect(logs[1]).toMatchObject({
      msg: 'charging card',
      orderId: 'ord-1',
      requestId: 'req-1',
      userId: 'user-1',
      step: 'payment'
    });
  });

  it('keeps contextual logging when using child loggers', async () => {
    const contextLogger = createBufferedLogger();
    const childLogger = contextLogger.logger.child({ service: 'billing' });

    await contextLogger.withContext({ requestId: 'req-child' }, async () => {
      childLogger.info('child logger call');
    });

    const logs = await contextLogger.readLogs();

    expect(logs[0]).toMatchObject({
      msg: 'child logger call',
      requestId: 'req-child',
      service: 'billing'
    });
  });

  it('can merge active OpenTelemetry span context into log lines', async () => {
    const traceId = '1'.repeat(32);
    const spanId = '2'.repeat(16);
    const span = {
      spanContext: () => ({
        traceId,
        spanId,
        traceFlags: 1
      })
    } as unknown as Span;

    const contextLogger = createBufferedLogger({
      includeOpenTelemetryContext: true
    });

    otelContext.with(trace.setSpan(otelContext.active(), span), () => {
      contextLogger.withContext({ requestId: 'req-otel' }, () => {
        contextLogger.logger.info('otel aware log');
      });
    });

    const logs = await contextLogger.readLogs();

    expect(logs[0]).toMatchObject({
      msg: 'otel aware log',
      requestId: 'req-otel',
      traceId,
      spanId,
      traceFlags: '01'
    });
  });

  it('composes with user-provided pino logMethod hooks', async () => {
    const contextLogger = createBufferedLogger({
      hooks: {
        logMethod(args, method) {
          if (typeof args[0] === 'string') {
            method.apply(this, [{ viaHook: true }, ...(args as [string, ...unknown[]])]);
            return;
          }

          method.apply(this, args);
        }
      }
    });

    await contextLogger.withContext({ requestId: 'req-hook' }, async () => {
      contextLogger.logger.info('hooked message');
    });

    const logs = await contextLogger.readLogs();

    expect(logs[0]).toMatchObject({
      msg: 'hooked message',
      requestId: 'req-hook',
      viaHook: true
    });
  });
});
