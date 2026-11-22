import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const { method, originalUrl } = req;

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Structured JSON log output
    const logData = {
      timestamp: new Date().toISOString(),
      method,
      path: originalUrl,
      status: statusCode,
      durationMs: duration,
      userAgent: req.get('user-agent') || 'internal',
    };

    if (statusCode >= 500) {
      console.error(JSON.stringify({ level: 'ERROR', ...logData }));
    } else if (statusCode >= 400) {
      console.warn(JSON.stringify({ level: 'WARN', ...logData }));
    } else {
      console.log(JSON.stringify({ level: 'INFO', ...logData }));
    }
  });

  next();
}
