import { describe, expect, it } from 'vitest';

import { createContextStore } from '../../src/store';

describe('concurrent context isolation', () => {
  it('keeps concurrently running request scopes fully isolated', async () => {
    const store = createContextStore();
    const results: string[] = [];

    await Promise.all([
      store.withContext({ requestId: 'req-1' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(store.getContext().requestId as string);
      }),
      store.withContext({ requestId: 'req-2' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push(store.getContext().requestId as string);
      })
    ]);

    expect(results).toHaveLength(2);
    expect(results).toContain('req-1');
    expect(results).toContain('req-2');
  });
});
