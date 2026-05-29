import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the DB helper so tests don't need a live database
vi.mock("./db", () => ({
  insertPartnerAccessRequest: vi.fn().mockResolvedValue({ insertId: 1 }),
  upsertUser: vi.fn(),
  getUserByOpenId: vi.fn(),
  getDb: vi.fn(),
}));

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// Minimal valid payload satisfying all required fields
const VALID_PAYLOAD = {
  firstName:           "Jane",
  lastName:            "Smith",
  firmName:            "Smith & Associates",
  email:               "jane@smithlaw.com",
  phone:               "555-000-0000",
  statesServed:        "California",
  practiceArea:        "Social Security Disability",
  monthlyLeadCapacity: "11–25",
} as const;

describe("partnerAccess.submit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a valid full submission and returns success with requestId", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.partnerAccess.submit({
      ...VALID_PAYLOAD,
      website: "https://smithlaw.com",
      message: "Looking to expand our SSDI intake pipeline.",
    });
    expect(result.success).toBe(true);
    expect(typeof result.requestId).toBe("number");
  });

  it("accepts a minimal submission with only required fields", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.partnerAccess.submit(VALID_PAYLOAD);
    expect(result.success).toBe(true);
  });

  it("rejects an empty firstName", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.partnerAccess.submit({ ...VALID_PAYLOAD, firstName: "" })
    ).rejects.toThrow();
  });

  it("rejects an invalid email", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.partnerAccess.submit({ ...VALID_PAYLOAD, email: "not-an-email" })
    ).rejects.toThrow();
  });

  it("rejects a missing required field (phone)", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    const { phone: _omit, ...withoutPhone } = VALID_PAYLOAD;
    await expect(
      caller.partnerAccess.submit(withoutPhone as typeof VALID_PAYLOAD)
    ).rejects.toThrow();
  });

  it("calls insertPartnerAccessRequest with normalized data", async () => {
    const { insertPartnerAccessRequest } = await import("./db");
    const caller = appRouter.createCaller(createPublicContext());
    await caller.partnerAccess.submit({
      ...VALID_PAYLOAD,
      email: "  Jane@SmithLaw.COM  ",
      firstName: "  Jane  ",
    });
    expect(insertPartnerAccessRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        firstName:    "Jane",
        email:        "jane@smithlaw.com",
        status:       "new",
        source:       "legalintakeflow.com",
      })
    );
  });

  it("silently succeeds without inserting when honeypot is filled", async () => {
    const { insertPartnerAccessRequest } = await import("./db");
    const caller = appRouter.createCaller(createPublicContext());
    const result = await caller.partnerAccess.submit({
      ...VALID_PAYLOAD,
      _hp: "bot-filled-this",
    });
    expect(result.success).toBe(true);
    expect(result.requestId).toBe(0);
    expect(insertPartnerAccessRequest).not.toHaveBeenCalled();
  });

  it("does NOT call notifyOwner (Phase 2 is DB-save only)", async () => {
    // notification module no longer exists — this test confirms the router
    // does not attempt to import or call it.
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.partnerAccess.submit(VALID_PAYLOAD)
    ).resolves.toMatchObject({ success: true });
  });
});
