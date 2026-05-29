import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { insertPartnerAccessRequest } from "./db";

// ── Validation schema (shared shape used by both router and client) ──────────

export const partnerAccessInputSchema = z.object({
  // Required contact fields
  firstName: z.string().min(1, "First name is required").max(100).trim(),
  lastName:  z.string().min(1, "Last name is required").max(100).trim(),
  firmName:  z.string().min(1, "Firm name is required").max(300).trim(),
  email:     z.string().min(1, "Email is required").email("Enter a valid email address").max(320),
  phone:     z.string().min(1, "Phone number is required").max(40).trim(),

  // Required practice fields
  statesServed:        z.string().min(1, "State(s) served is required").max(2000).trim(),
  practiceArea:        z.string().min(1, "Practice area is required").max(100),
  monthlyLeadCapacity: z.string().min(1, "Monthly lead capacity is required").max(20),

  // Optional fields
  website: z.string().max(500).trim().optional(),
  message: z.string().max(5000).trim().optional(),

  // Honeypot — must be empty; bots fill it, humans don't see it
  _hp: z.string().max(200).optional(),
});

export type PartnerAccessInput = z.infer<typeof partnerAccessInputSchema>;

// ── App router ───────────────────────────────────────────────────────────────

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ── Partner access requests ────────────────────────────────────────────────
  partnerAccess: router({
    submit: publicProcedure
      .input(partnerAccessInputSchema)
      .mutation(async ({ input }) => {
        // ── Honeypot check ────────────────────────────────────────────────────
        // If the hidden _hp field is filled, silently return success without
        // inserting — prevents simple bot spam without affecting real users.
        if (input._hp && input._hp.trim().length > 0) {
          return { success: true, requestId: 0 } as const;
        }

        // ── Normalize ─────────────────────────────────────────────────────────
        const normalized = {
          firstName:           input.firstName.trim(),
          lastName:            input.lastName.trim(),
          firmName:            input.firmName.trim(),
          email:               input.email.trim().toLowerCase(),
          phone:               input.phone.trim(),
          website:             input.website?.trim() || null,
          statesServed:        input.statesServed.trim(),
          practiceArea:        input.practiceArea,
          monthlyLeadCapacity: input.monthlyLeadCapacity,
          message:             input.message?.trim() || null,
          status:              "new" as const,
          source:              "legalintakeflow.com",
        };

        // ── Insert ────────────────────────────────────────────────────────────
        const { insertId } = await insertPartnerAccessRequest(normalized);

        return { success: true, requestId: insertId } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
