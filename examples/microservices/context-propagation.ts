import axios from 'axios';

import {
  createAxiosContextInterceptor,
  createContextLogger,
  injectTraceContextHeaders
} from '../../src';

const upstream = createContextLogger({
  level: 'info'
});

const client = axios.create({
  baseURL: 'http://localhost:4000'
});

client.interceptors.request.use(createAxiosContextInterceptor(upstream.getLogContext));

await upstream.withContext(
  {
    requestId: 'req-demo',
    traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
    spanId: '00f067aa0ba902b7'
  },
  async () => {
    upstream.logger.info('calling downstream service');

    const headers = injectTraceContextHeaders({}, upstream.getLogContext());
    upstream.logger.info({ headers }, 'generated propagation headers');

    await client.get('/health');
  }
);
