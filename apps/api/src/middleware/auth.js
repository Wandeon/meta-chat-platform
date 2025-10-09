"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticateTenant = authenticateTenant;
exports.authenticateAdmin = authenticateAdmin;
const http_errors_1 = __importDefault(require("http-errors"));
const shared_1 = require("@meta-chat/shared");
const prisma_1 = require("../prisma");
const AUTH_HEADER = 'x-api-key';
const ADMIN_HEADER = 'x-admin-key';
async function resolveTenantByApiKey(apiKey) {
    let prefix;
    try {
        ({ prefix } = (0, shared_1.deriveApiKeyMetadata)(apiKey));
    }
    catch (error) {
        return null;
    }
    const candidate = await prisma_1.prisma.tenantApiKey.findFirst({
        where: {
            prefix,
            active: true,
        },
        include: {
            tenant: true,
        },
    });
    if (!candidate) {
        return null;
    }
    const isValid = await (0, shared_1.verifySecret)(apiKey, candidate.hash, candidate.salt);
    if (!isValid) {
        return null;
    }
    if (candidate.expiresAt && candidate.expiresAt < new Date()) {
        return null;
    }
    await prisma_1.prisma.tenantApiKey.update({
        where: { id: candidate.id },
        data: { lastUsedAt: new Date() },
    });
    return {
        tenantId: candidate.tenantId,
        apiKeyId: candidate.id,
    };
}
async function resolveAdminByApiKey(apiKey) {
    let prefix;
    try {
        ({ prefix } = (0, shared_1.deriveApiKeyMetadata)(apiKey));
    }
    catch (error) {
        return null;
    }
    const candidate = await prisma_1.prisma.adminApiKey.findFirst({
        where: {
            prefix,
            active: true,
        },
        include: {
            admin: true,
        },
    });
    if (!candidate) {
        return null;
    }
    const isValid = await (0, shared_1.verifySecret)(apiKey, candidate.hash, candidate.salt);
    if (!isValid) {
        return null;
    }
    if (candidate.expiresAt && candidate.expiresAt < new Date()) {
        return null;
    }
    await prisma_1.prisma.adminApiKey.update({
        where: { id: candidate.id },
        data: { lastUsedAt: new Date() },
    });
    return {
        adminId: candidate.adminId,
        role: candidate.admin.role,
        apiKeyId: candidate.id,
    };
}
async function authenticateTenant(req, _res, next) {
    const apiKey = req.header(AUTH_HEADER) ?? req.query.apiKey;
    if (typeof apiKey !== 'string' || apiKey.length === 0) {
        return next((0, http_errors_1.default)(401, 'Missing tenant API key'));
    }
    const resolved = await resolveTenantByApiKey(apiKey);
    if (!resolved) {
        return next((0, http_errors_1.default)(401, 'Invalid tenant API key'));
    }
    req.tenant = {
        id: resolved.tenantId,
        apiKeyId: resolved.apiKeyId,
    };
    return next();
}
async function authenticateAdmin(req, _res, next) {
    const apiKey = req.header(ADMIN_HEADER) ?? req.header(AUTH_HEADER);
    if (typeof apiKey !== 'string' || apiKey.length === 0) {
        return next((0, http_errors_1.default)(401, 'Missing admin API key'));
    }
    const resolved = await resolveAdminByApiKey(apiKey);
    if (!resolved) {
        return next((0, http_errors_1.default)(401, 'Invalid admin API key'));
    }
    req.adminUser = {
        id: resolved.adminId,
        role: resolved.role,
    };
    return next();
}
//# sourceMappingURL=auth.js.map