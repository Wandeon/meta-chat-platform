import type { NextFunction, Request, Response } from 'express';
interface TenantContext {
    id: string;
    apiKeyId: string;
}
interface AdminContext {
    id: string;
    role: string;
}
declare global {
    namespace Express {
        interface Request {
            tenant?: TenantContext;
            adminUser?: AdminContext;
        }
    }
}
export declare function authenticateTenant(req: Request, _res: Response, next: NextFunction): Promise<void>;
export declare function authenticateAdmin(req: Request, _res: Response, next: NextFunction): Promise<void>;
export {};
//# sourceMappingURL=auth.d.ts.map