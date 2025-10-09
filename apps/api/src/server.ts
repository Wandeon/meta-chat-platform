import express from 'express';
import createHttpError from 'http-errors';
import apiKeyRouter from './routes/apiKeys';

const app = express();

app.use(express.json());
app.use('/api/security', apiKeyRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, _res, next) => {
  next(createHttpError(404, `Route not found: ${req.method} ${req.originalUrl}`));
});

app.use(
  (err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const status = err.status || 500;
    res.status(status).json({
      error: err.message || 'Internal Server Error',
      status,
    });
  },
);

if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  app.listen(port, () => {
    console.log(`API server listening on port ${port}`);
  });
}

export default app;
