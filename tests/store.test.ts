import { describe, expect, it } from 'vitest';

import { createContextStore } from '../src/store';

describe('context store', () => {
  it('merges context updates and clears the current store', () => {
    const store = createContextStore();

    store.setContext({ requestId: 'req-1' });
    store.setContext({ userId: 'user-1' });

    expect(store.getContext()).toEqual({
      requestId: 'req-1',
      userId: 'user-1'
    });

    store.clearContext();

    expect(store.getContext()).toEqual({});
  });

  it('supports nested context scopes without leaking overwritten values', async () => {
    const store = createContextStore();

    const snapshot = await store.withContext({ requestId: 'req-1', step: 'root' }, async () => {
      return store.withContext({ step: 'child', orderId: 'ord-1' }, async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return store.getContext();
      });
    });

    expect(snapshot).toEqual({
      requestId: 'req-1',
      step: 'child',
      orderId: 'ord-1'
    });
  });
});
