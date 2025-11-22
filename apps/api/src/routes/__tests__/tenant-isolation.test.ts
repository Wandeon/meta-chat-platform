import express from "express";
import request from "supertest";
import { describe, expect, it, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({
  conversationsFindMany: vi.fn(),
  conversationsFindFirst: vi.fn(),
  documentsFindMany: vi.fn(),
  documentsFindFirst: vi.fn(),
}));

vi.mock("../../middleware/auth", () => ({
  authenticateAdminOrTenant: (req: any, _res: any, next: any) => {
    req.tenant = { id: "tenant-auth" };
    next();
  },
  authenticateTenant: (req: any, _res: any, next: any) => {
    req.tenant = { id: "tenant-auth" };
    next();
  },
}));

vi.mock("@meta-chat/database", () => ({
  getPrismaClient: () => ({
    conversation: {
      findMany: mocks.conversationsFindMany,
      findFirst: mocks.conversationsFindFirst,
    },
    document: {
      findMany: mocks.documentsFindMany,
      findFirst: mocks.documentsFindFirst,
    },
  }),
}));

import conversationsRouter from "../conversations";
import documentsRouter from "../documents";

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/conversations", conversationsRouter);
  app.use("/documents", documentsRouter);
  app.use((err: any, _req: any, res: any, _next: any) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

describe("tenant isolation routes", () => {
  beforeEach(() => {
    mocks.conversationsFindMany.mockReset();
    mocks.conversationsFindFirst.mockReset();
    mocks.documentsFindMany.mockReset();
    mocks.documentsFindFirst.mockReset();
  });

  it("rejects conversations list when tenantId mismatches auth", async () => {
    const app = buildApp();
    const res = await request(app).get("/conversations").query({ tenantId: "other-tenant" });
    expect(res.status).toBe(403);
    expect(mocks.conversationsFindMany).not.toHaveBeenCalled();
  });

  it("lists conversations for authenticated tenant", async () => {
    mocks.conversationsFindMany.mockResolvedValue([{ id: "c1", tenantId: "tenant-auth" }]);
    const app = buildApp();
    const res = await request(app).get("/conversations");
    expect(res.status).toBe(200);
    expect(mocks.conversationsFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-auth",
      },
      orderBy: { lastMessageAt: "desc" },
    });
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ id: "c1", tenantId: "tenant-auth" }]);
  });

  it("rejects documents list when tenantId mismatches auth", async () => {
    const app = buildApp();
    const res = await request(app).get("/documents").query({ tenantId: "other" });
    expect(res.status).toBe(403);
    expect(mocks.documentsFindMany).not.toHaveBeenCalled();
  });

  it("lists documents for authenticated tenant", async () => {
    mocks.documentsFindMany.mockResolvedValue([{ id: "d1", tenantId: "tenant-auth" }]);
    const app = buildApp();
    const res = await request(app).get("/documents");
    expect(res.status).toBe(200);
    expect(mocks.documentsFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-auth",
      },
      orderBy: { createdAt: "desc" },
    });
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([{ id: "d1", tenantId: "tenant-auth" }]);
  });
});
