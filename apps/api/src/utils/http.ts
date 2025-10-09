import type { NextFunction, Request, Response, RequestHandler } from 'express';
import createHttpError from 'http-errors';
import { ZodSchema, ZodError } from 'zod';

export interface ValidatedRequest<B = any, Q = any, P = any> extends Request<P, any, B, Q> {}

export function asyncHandler<
  Params = any,
  ResBody = any,
  ReqBody = any,
  ReqQuery = any,
  Locals extends Record<string, any> = Record<string, any>
>(handler: (req: ValidatedRequest<ReqBody, ReqQuery, Params>, res: Response<ResBody, Locals>, next: NextFunction) => Promise<any>) {
  const wrapped: RequestHandler<Params, ResBody, ReqBody, ReqQuery, Locals> = (req, res, next) => {
    Promise.resolve(handler(req as any, res, next)).catch(next);
  };

  return wrapped;
}

export function parseWithSchema<T>(schema: ZodSchema<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw createHttpError(400, 'Validation failed', {
        errors: error.issues,
      });
    }

    throw error;
  }
}

export function respondSuccess(res: Response, data: unknown, status = 200): void {
  res.status(status).json({
    success: true,
    data,
  });
}

export function respondCreated(res: Response, data: unknown): void {
  respondSuccess(res, data, 201);
}
