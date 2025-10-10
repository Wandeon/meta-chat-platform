import { Router } from 'express';
import createHttpError from 'http-errors';
import { getPrismaClient } from '@meta-chat/database';
import { authenticateAdmin } from '../middleware/auth';
import { asyncHandler, parseWithSchema, respondCreated, respondSuccess } from '../utils/http';
import { z } from 'zod';

const prisma = getPrismaClient();
const router = Router();

router.use(authenticateAdmin);

const createMcpServerSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  command: z.string().min(1),
  args: z.array(z.string()).default([]),
  env: z.record(z.string(), z.string()).default({}),
  enabled: z.boolean().default(true),
});

const updateMcpServerSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  command: z.string().min(1).optional(),
  args: z.array(z.string()).optional(),
  env: z.record(z.string(), z.string()).optional(),
  enabled: z.boolean().optional(),
});

// List all MCP servers
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const servers = await prisma.mcpServer.findMany({
      orderBy: { name: 'asc' },
    });

    respondSuccess(res, servers);
  }),
);

// Get single MCP server
router.get(
  '/:serverId',
  asyncHandler(async (req, res) => {
    const { serverId } = req.params;

    const server = await prisma.mcpServer.findUnique({
      where: { id: serverId },
    });

    if (!server) {
      throw createHttpError(404, 'MCP server not found');
    }

    respondSuccess(res, server);
  }),
);

// Create MCP server
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const payload = parseWithSchema(createMcpServerSchema, req.body);

    const server = await prisma.mcpServer.create({
      data: {
        name: payload.name,
        description: payload.description,
        command: payload.command,
        args: payload.args,
        env: payload.env,
        enabled: payload.enabled,
      },
    });

    respondCreated(res, server);
  }),
);

// Update MCP server
router.patch(
  '/:serverId',
  asyncHandler(async (req, res) => {
    const { serverId } = req.params;
    const payload = parseWithSchema(updateMcpServerSchema, req.body);

    const existing = await prisma.mcpServer.findUnique({
      where: { id: serverId },
    });

    if (!existing) {
      throw createHttpError(404, 'MCP server not found');
    }

    const server = await prisma.mcpServer.update({
      where: { id: serverId },
      data: {
        name: payload.name ?? existing.name,
        description: payload.description !== undefined ? payload.description : existing.description,
        command: payload.command ?? existing.command,
        args: payload.args ?? existing.args,
        env: payload.env ?? existing.env,
        enabled: payload.enabled ?? existing.enabled,
      },
    });

    respondSuccess(res, server);
  }),
);

// Delete MCP server
router.delete(
  '/:serverId',
  asyncHandler(async (req, res) => {
    const { serverId } = req.params;

    const existing = await prisma.mcpServer.findUnique({
      where: { id: serverId },
    });

    if (!existing) {
      throw createHttpError(404, 'MCP server not found');
    }

    await prisma.mcpServer.delete({
      where: { id: serverId },
    });

    respondSuccess(res, { id: serverId, deleted: true });
  }),
);

export default router;
