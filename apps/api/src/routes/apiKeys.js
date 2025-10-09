"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const http_errors_1 = __importDefault(require("http-errors"));
const shared_1 = require("@meta-chat/shared");
const auth_1 = require("../middleware/auth");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.use(auth_1.authenticateAdmin);
function assertCanManageAdmin(req, adminId) {
    if (!req.adminUser) {
        throw (0, http_errors_1.default)(401, 'Missing admin context');
    }
    if (req.adminUser.id !== adminId && req.adminUser.role !== 'SUPER') {
        throw (0, http_errors_1.default)(403, 'Insufficient permissions for admin user');
    }
}
function assertSuperAdmin(req) {
    if (!req.adminUser) {
        throw (0, http_errors_1.default)(401, 'Missing admin context');
    }
    if (req.adminUser.role !== 'SUPER') {
        throw (0, http_errors_1.default)(403, 'Super admin privileges required');
    }
}
router.post('/admin/users/:adminId/api-keys', async (req, res, next) => {
    try {
        const { adminId } = req.params;
        assertCanManageAdmin(req, adminId);
        const label = typeof req.body?.label === 'string' ? req.body.label : undefined;
        const metadata = (0, shared_1.generateApiKey)('adm');
        const hashed = await (0, shared_1.hashSecret)(metadata.apiKey);
        const record = await prisma_1.prisma.adminApiKey.create({
            data: {
                adminId,
                label,
                prefix: metadata.prefix,
                hash: hashed.hash,
                salt: hashed.salt,
                lastFour: metadata.lastFour,
            },
        });
        res.status(201).json({
            id: record.id,
            apiKey: metadata.apiKey,
            lastFour: metadata.lastFour,
            prefix: metadata.prefix,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/admin/users/:adminId/api-keys/:keyId/rotation', async (req, res, next) => {
    try {
        const { adminId, keyId } = req.params;
        assertCanManageAdmin(req, adminId);
        const key = await prisma_1.prisma.adminApiKey.findFirst({
            where: {
                id: keyId,
                adminId,
                active: true,
            },
        });
        if (!key) {
            throw (0, http_errors_1.default)(404, 'Admin API key not found');
        }
        const rotation = await (0, shared_1.generateRotationToken)();
        await prisma_1.prisma.adminApiKey.update({
            where: { id: key.id },
            data: {
                rotationTokenHash: rotation.hash,
                rotationTokenSalt: rotation.salt,
                rotationIssuedAt: new Date(),
                rotationExpiresAt: rotation.expiresAt,
            },
        });
        res.json({
            rotationToken: rotation.token,
            expiresAt: rotation.expiresAt.toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/admin/users/:adminId/api-keys/:keyId/rotation/confirm', async (req, res, next) => {
    try {
        const { adminId, keyId } = req.params;
        assertCanManageAdmin(req, adminId);
        const token = typeof req.body?.token === 'string' ? req.body.token : undefined;
        if (!token) {
            throw (0, http_errors_1.default)(400, 'Rotation token is required');
        }
        const key = await prisma_1.prisma.adminApiKey.findFirst({
            where: {
                id: keyId,
                adminId,
                active: true,
            },
        });
        if (!key || !key.rotationTokenHash || !key.rotationTokenSalt || !key.rotationExpiresAt) {
            throw (0, http_errors_1.default)(400, 'No pending rotation for this API key');
        }
        if (key.rotationExpiresAt.getTime() < Date.now()) {
            throw (0, http_errors_1.default)(400, 'Rotation token has expired');
        }
        const validToken = await (0, shared_1.verifySecret)(token, key.rotationTokenHash, key.rotationTokenSalt);
        if (!validToken) {
            throw (0, http_errors_1.default)(400, 'Invalid rotation token');
        }
        const metadata = (0, shared_1.generateApiKey)('adm');
        const hashed = await (0, shared_1.hashSecret)(metadata.apiKey);
        await prisma_1.prisma.adminApiKey.update({
            where: { id: keyId },
            data: {
                hash: hashed.hash,
                salt: hashed.salt,
                prefix: metadata.prefix,
                lastFour: metadata.lastFour,
                rotatedAt: new Date(),
                rotationTokenHash: null,
                rotationTokenSalt: null,
                rotationIssuedAt: null,
                rotationExpiresAt: null,
            },
        });
        res.json({
            apiKey: metadata.apiKey,
            lastFour: metadata.lastFour,
            prefix: metadata.prefix,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/tenants/:tenantId/api-keys', async (req, res, next) => {
    try {
        assertSuperAdmin(req);
        const { tenantId } = req.params;
        const label = typeof req.body?.label === 'string' ? req.body.label : undefined;
        const metadata = (0, shared_1.generateApiKey)('ten');
        const hashed = await (0, shared_1.hashSecret)(metadata.apiKey);
        const record = await prisma_1.prisma.tenantApiKey.create({
            data: {
                tenantId,
                label,
                prefix: metadata.prefix,
                hash: hashed.hash,
                salt: hashed.salt,
                lastFour: metadata.lastFour,
            },
        });
        res.status(201).json({
            id: record.id,
            apiKey: metadata.apiKey,
            lastFour: metadata.lastFour,
            prefix: metadata.prefix,
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/tenants/:tenantId/api-keys/:keyId/rotation', async (req, res, next) => {
    try {
        assertSuperAdmin(req);
        const { tenantId, keyId } = req.params;
        const key = await prisma_1.prisma.tenantApiKey.findFirst({
            where: {
                id: keyId,
                tenantId,
                active: true,
            },
        });
        if (!key) {
            throw (0, http_errors_1.default)(404, 'Tenant API key not found');
        }
        const rotation = await (0, shared_1.generateRotationToken)();
        await prisma_1.prisma.tenantApiKey.update({
            where: { id: key.id },
            data: {
                rotationTokenHash: rotation.hash,
                rotationTokenSalt: rotation.salt,
                rotationIssuedAt: new Date(),
                rotationExpiresAt: rotation.expiresAt,
            },
        });
        res.json({
            rotationToken: rotation.token,
            expiresAt: rotation.expiresAt.toISOString(),
        });
    }
    catch (error) {
        next(error);
    }
});
router.post('/tenants/:tenantId/api-keys/:keyId/rotation/confirm', async (req, res, next) => {
    try {
        assertSuperAdmin(req);
        const { tenantId, keyId } = req.params;
        const token = typeof req.body?.token === 'string' ? req.body.token : undefined;
        if (!token) {
            throw (0, http_errors_1.default)(400, 'Rotation token is required');
        }
        const key = await prisma_1.prisma.tenantApiKey.findFirst({
            where: {
                id: keyId,
                tenantId,
                active: true,
            },
        });
        if (!key || !key.rotationTokenHash || !key.rotationTokenSalt || !key.rotationExpiresAt) {
            throw (0, http_errors_1.default)(400, 'No pending rotation for this API key');
        }
        if (key.rotationExpiresAt.getTime() < Date.now()) {
            throw (0, http_errors_1.default)(400, 'Rotation token has expired');
        }
        const validToken = await (0, shared_1.verifySecret)(token, key.rotationTokenHash, key.rotationTokenSalt);
        if (!validToken) {
            throw (0, http_errors_1.default)(400, 'Invalid rotation token');
        }
        const metadata = (0, shared_1.generateApiKey)('ten');
        const hashed = await (0, shared_1.hashSecret)(metadata.apiKey);
        await prisma_1.prisma.tenantApiKey.update({
            where: { id: keyId },
            data: {
                hash: hashed.hash,
                salt: hashed.salt,
                prefix: metadata.prefix,
                lastFour: metadata.lastFour,
                rotatedAt: new Date(),
                rotationTokenHash: null,
                rotationTokenSalt: null,
                rotationIssuedAt: null,
                rotationExpiresAt: null,
            },
        });
        res.json({
            apiKey: metadata.apiKey,
            lastFour: metadata.lastFour,
            prefix: metadata.prefix,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.default = router;
//# sourceMappingURL=apiKeys.js.map