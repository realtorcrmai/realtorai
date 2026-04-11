import express, { type Express } from 'express';
import { healthRouter } from './routes/health.js';
import { eventsRouter } from './routes/events.js';
import { webhooksRouter } from './routes/webhooks.js';
import { metricsRouter } from './routes/metrics.js';
import { webViewRouter } from './routes/web-view.js';
import { logger } from './lib/logger.js';

export function createApp(): Express {
  const app = express();

  // N8: capture the raw body BEFORE JSON parsing. Needed for HMAC signature
  // verification (events route) and Svix signature verification (webhooks).
  // `req.rawBody` is a Buffer of the original bytes.
  app.use(
    express.json({
      limit: '1mb',
      verify: (req, _res, buf) => {
        (req as express.Request & { rawBody?: Buffer }).rawBody = buf;
      },
    })
  );

  // P6: request log with method + path.
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, path: req.path }, 'http: request');
    next();
  });

  app.use(healthRouter);
  app.use(eventsRouter);
  app.use(webhooksRouter);
  app.use(metricsRouter);
  app.use(webViewRouter);

  // 404
  app.use((req, res) => {
    res.status(404).json({ error: 'not found', path: req.path });
  });

  // Error handler
  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error({ err }, 'http: unhandled error');
    res.status(500).json({ error: 'internal error' });
  });

  return app;
}
