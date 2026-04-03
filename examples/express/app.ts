import express from 'express';

import { createContextLogger, createContextStore, createExpressMiddleware } from '../../src';

const store = createContextStore();

const contextLogger = createContextLogger({
  level: 'info',
  includeOpenTelemetryContext: true,
  store
});

const app = express();

app.use(createExpressMiddleware({ store }));

app.get('/orders', async (_req, res) => {
  contextLogger.logger.info('loading orders');
  await contextLogger.withContext({ feature: 'orders' }, async () => {
    contextLogger.logger.info({ count: 3 }, 'orders loaded');
  });

  res.json({ ok: true, context: contextLogger.getContext() });
});

app.listen(3000, () => {
  contextLogger.logger.info('express example listening on :3000');
});
