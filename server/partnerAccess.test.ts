import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the DB helper and notification so tests don't need a live database
vi.mock("./db", () => ({
  insertPartnerAccessRequest: vi.fn().mockResolvedValue(undefined),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getDb: vi.fn(),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("partnerAccess.submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a valid full submission and returns success", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.partnerAccess.submit({
      name: "Jane Smith",
      firm: "Smith & Associates",
      email: "jane@smithlaw.com",
      phone: "555-000-0000",
      state: "California",
      message: "Looking to expand our SSDI intake pipeline.",
    });
    expect(result).toEqual({ success: true });
  });

  it("accepts a minimal submission with only required fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.partnerAccess.submit({
      name: "John Doe",
      email: "john@example.com",
    });
    expect(result).toEqual({ success: true });
  });

  it("rejects an empty name", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.partnerAccess.submit({ name: "", email: "test@example.com" })
    ).rejects.toThrow();
  });

  it("rejects an invalid email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.partnerAccess.submit({ name: "Test", email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("calls insertPartnerAccessRequest with correct data", async () => {
    const { insertPartnerAccessRequest } = await import("./db");
    const caller = appRouter.createCaller(createPublicContext());
    await caller.partnerAccess.submit({
      name: "Alice",
      email: "alice@lawfirm.com",
      state: "Texas",
    });
    expect(insertPartnerAccessRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Alice",
        email: "alice@lawfirm.com",
        state: "Texas",
      })
    );
  });

  it("calls notifyOwner after successful insert", async () => {
    const { notifyOwner } = await import("./_core/notification");
    const caller = appRouter.createCaller(createPublicContext());
    await caller.partnerAccess.submit({
      name: "Bob",
      email: "bob@advocates.org",
    });
    expect(notifyOwner).toHaveBeenCalledWith(
      expect.objectContaining({ title: expect.stringContaining("Bob") })
    );
  });
});
