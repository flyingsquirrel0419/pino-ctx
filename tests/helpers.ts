import { PassThrough } from 'node:stream';

import { createContextLogger } from '../src/createContextLogger';
import { createContextStore } from '../src/store';
import type { ContextLoggerOptions } from '../src/types';

export function createBufferedLogger(options: Omit<ContextLoggerOptions, 'destination' | 'store'> = {}) {
  const destination = new PassThrough();
  const store = createContextStore();
  let rawOutput = '';

  destination.on('data', (chunk) => {
    rawOutput += chunk.toString('utf8');
  });

  const contextLogger = createContextLogger({
    base: null,
    timestamp: false,
    destination,
    store,
    ...options
  });

  return {
    ...contextLogger,
    store,
    readRaw: () => rawOutput,
    readLogs: async () => {
      await waitForLogFlush();

      return rawOutput
        .trim()
        .split('\n')
        .filter(Boolean)
        .map((line) => JSON.parse(line) as Record<string, unknown>);
    }
  };
}

export async function waitForLogFlush(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
