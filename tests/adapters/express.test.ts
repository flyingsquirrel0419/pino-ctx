import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createExpressMiddleware } from '../../src/adapters/express';
import { createBufferedLogger } from '../helpers';

describe('express adapter', () => {
  it('propagates request context through async handlers', async () => {
    const contextLogger = createBufferedLogger();
    const app = express();

    app.use(
      createExpressMiddleware({
        store: contextLogger.store,
        extractContext: (req) => ({
          requestId: req.header('x-request-id') ?? 'missing',
          userId: 'user-express'
        })
      })
    );

    app.get('/orders', async (_req, res) => {
      await new Promise((resolve) => setTimeout(resolve, 5));
      contextLogger.logger.info('listing orders');
      res.json({ context: contextLogger.getContext() });
    });

    const response = await request(app).get('/orders').set('x-request-id', 'req-express');

    expect(response.body.context).toEqual({
      requestId: 'req-express',
      userId: 'user-express'
    });

    const logs = await contextLogger.readLogs();

    expect(logs[0]).toMatchObject({
      msg: 'listing orders',
      requestId: 'req-express',
      userId: 'user-express'
    });
  });
});
