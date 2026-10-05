import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiRequest } from "./api";

describe("API client integration", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("handles successful registration from Spring Boot backend", async () => {
    const mockResponse = {
      token: "mock-jwt-token-12345",
      user: {
        id: "1",
        name: "Test User",
        email: "test@example.com",
        username: "testuser",
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const res = await apiRequest<{ token: string; user: { name: string; email: string; username: string } }>(
      "/auth/register",
      {
        method: "POST",
        body: JSON.stringify({
          name: "Test User",
          email: "test@example.com",
          username: "testuser",
          password: "password123",
        }),
      }
    );

    expect(res.token).toBe("mock-jwt-token-12345");
    expect(res.user.email).toBe("test@example.com");
    expect(res.user.username).toBe("testuser");
  });

  it("handles successful login with either username or email", async () => {
    const mockResponse = {
      accessToken: "mock-access-token-67890",
      user: {
        id: "2",
        name: "Jane Doe",
        email: "jane@company.com",
        username: "janedoe",
      },
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const res = await apiRequest<{ accessToken: string; user: { username: string } }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: "janedoe",
        password: "password123",
      }),
    });

    expect(res.accessToken).toBe("mock-access-token-67890");
    expect(res.user.username).toBe("janedoe");
  });

  it("parses Spring Boot error messages accurately", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: "Email already taken" }),
    });

    await expect(
      apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email: "taken@example.com" }),
      })
    ).rejects.toThrow("Email already taken");
  });

  it("loads projects successfully when 404 or backend offline", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: "Not found" }),
    });

    const projects = await apiRequest<Array<{ id: string; name: string }>>("/projects");
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThan(0);
  });
});
