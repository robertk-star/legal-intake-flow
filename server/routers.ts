import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { insertPartnerAccessRequest } from "./db";
import { notifyOwner } from "./_core/notification";

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

  // ── Partner access requests ──────────────────────────────────────────────
  partnerAccess: router({
    submit: publicProcedure
      .input(
        z.object({
          name:    z.string().min(1).max(200),
          firm:    z.string().max(300).optional(),
          email:   z.string().email().max(320),
          phone:   z.string().max(40).optional(),
          state:   z.string().max(100).optional(),
          message: z.string().max(5000).optional(),
        })
      )
      .mutation(async ({ input }) => {
        await insertPartnerAccessRequest({
          name:    input.name,
          firm:    input.firm ?? null,
          email:   input.email,
          phone:   input.phone ?? null,
          state:   input.state ?? null,
          message: input.message ?? null,
        });

        // Notify owner of new access request
        try {
          await notifyOwner({
            title: `New Partner Access Request — ${input.name}`,
            content: [
              `**Name:** ${input.name}`,
              `**Firm:** ${input.firm ?? "—"}`,
              `**Email:** ${input.email}`,
              `**Phone:** ${input.phone ?? "—"}`,
              `**State:** ${input.state ?? "—"}`,
              `**Message:** ${input.message ?? "—"}`,
            ].join("\n"),
          });
        } catch (err) {
          // Non-fatal: log but don't fail the submission
          console.error("[partnerAccess.submit] notifyOwner failed:", err);
        }

        return { success: true } as const;
      }),
  }),
});

export type AppRouter = typeof appRouter;
