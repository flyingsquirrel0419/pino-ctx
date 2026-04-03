import Koa from 'koa';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createKoaMiddleware } from '../../src/adapters/koa';
import { createBufferedLogger } from '../helpers';

describe('koa adapter', () => {
  it('preserves context for downstream middleware and handlers', async () => {
    const contextLogger = createBufferedLogger();
    const app = new Koa();

    app.use(
      createKoaMiddleware({
        store: contextLogger.store,
        extractContext: (ctx) => ({
          requestId: ctx.get('x-request-id'),
          tenantId: 'tenant-koa'
        })
      })
    );

    app.use(async (ctx) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      contextLogger.logger.info('koa handler');
      ctx.body = { context: contextLogger.getContext() };
    });

    const response = await request(app.callback())
      .get('/orders')
      .set('x-request-id', 'req-koa');

    expect(response.body.context).toEqual({
      requestId: 'req-koa',
      tenantId: 'tenant-koa'
    });

    const logs = await contextLogger.readLogs();

    expect(logs[0]).toMatchObject({
      msg: 'koa handler',
      requestId: 'req-koa',
      tenantId: 'tenant-koa'
    });
  });
});
