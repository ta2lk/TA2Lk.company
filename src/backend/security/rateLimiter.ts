/**
 * Industrial Brain — Rate Limiting Abstraction
 * Phase 1: Core Platform
 */

import { Request, Response, NextFunction } from 'express';

interface RateRecord {
  count: number;
  resetTime: number;
}

const rateStore = new Map<string, RateRecord>();

export function createRateLimiter(options: { maxRequests: number; windowMs: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = (req.ip || req.socket.remoteAddress || 'unknown') + ':' + req.baseUrl;
    const now = Date.now();

    const record = rateStore.get(key);

    if (!record || now > record.resetTime) {
      rateStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      });
      return next();
    }

    if (record.count >= options.maxRequests) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil((record.resetTime - now) / 1000)} seconds.`,
      });
      return;
    }

    record.count += 1;
    return next();
  };
}
