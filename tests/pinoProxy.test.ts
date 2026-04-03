import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { createContextualLogger } from '../src/pinoProxy';
import { createContextStore } from '../src/store';

describe('pinoProxy hook integration', () => {
  it('injects store context directly through pino hooks.logMethod', async () => {
    const destination = new PassThrough();
    let output = '';

    destination.on('data', (chunk) => {
      output += chunk.toString('utf8');
    });

    const store = createContextStore();
    const logger = createContextualLogger({
      destination,
      getContext: store.getContext,
      options: {
        base: null,
        timestamp: false
      }
    });

    await store.withContext({ requestId: 'req-hook-direct' }, async () => {
      logger.info('hooked logger');
    });

    const parsed = JSON.parse(output.trim()) as Record<string, unknown>;

    expect(parsed).toMatchObject({
      msg: 'hooked logger',
      requestId: 'req-hook-direct'
    });
  });
});
