import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";

describe("Auth API Integration Tests", () => {
  let request: ReturnType<typeof supertest>;
  const apiUrl = process.env.API_URL || "http://localhost:3000";
  const testEmail = `test-${Math.random().toString(36).substring(7)}@example.com`;
  const testPassword = "TestPassword123!";
  let authToken: string;

  beforeAll(() => {
    request = supertest(apiUrl);
  });

  describe("POST /api/auth/signup", () => {
    it("should create a new user account", async () => {
      const response = await request
        .post("/api/auth/signup")
        .send({
          email: testEmail,
          password: testPassword,
          name: "Test User",
        })
        .expect(201);

      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("token");
      expect(response.body.user.email).toBe(testEmail);
      authToken = response.body.token;
    });

    it("should reject duplicate email", async () => {
      const response = await request
        .post("/api/auth/signup")
        .send({
          email: testEmail,
          password: testPassword,
          name: "Duplicate User",
        })
        .expect(409);

      expect(response.body).toHaveProperty("error");
    });

    it("should validate email format", async () => {
      const response = await request
        .post("/api/auth/signup")
        .send({
          email: "invalid-email",
          password: testPassword,
          name: "Test User",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should validate password strength", async () => {
      const response = await request
        .post("/api/auth/signup")
        .send({
          email: `weak-${Math.random().toString(36).substring(7)}@example.com`,
          password: "weak",
          name: "Test User",
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });

    it("should require all fields", async () => {
      const response = await request
        .post("/api/auth/signup")
        .send({
          email: `incomplete-${Math.random().toString(36).substring(7)}@example.com`,
        })
        .expect(400);

      expect(response.body).toHaveProperty("error");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should login with valid credentials", async () => {
      const response = await request
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(200);

      expect(response.body).toHaveProperty("user");
      expect(response.body).toHaveProperty("token");
      expect(response.body.user.email).toBe(testEmail);
    });

    it("should reject invalid email", async () => {
      const response = await request
        .post("/api/auth/login")
        .send({
          email: "nonexistent@example.com",
          password: testPassword,
        })
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });

    it("should reject invalid password", async () => {
      const response = await request
        .post("/api/auth/login")
        .send({
          email: testEmail,
          password: "WrongPassword123!",
        })
        .expect(401);

      expect(response.body).toHaveProperty("error");
    });
  });
});
