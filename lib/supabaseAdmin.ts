import { createClient } from "@supabase/supabase-js";

// ── Server-only Supabase admin client ────────────────────────────────────────
// This file must ONLY be imported in server-side code (API routes, Server
// Components, Server Actions). Never import this in client components.
//
// The service role key bypasses Row Level Security and must never be exposed
// to the browser.

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error(
    "[supabaseAdmin] Missing environment variable: NEXT_PUBLIC_SUPABASE_URL"
  );
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "[supabaseAdmin] Missing environment variable: SUPABASE_SERVICE_ROLE_KEY"
  );
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    // Disable session persistence — this is a server-only admin client
    persistSession: false,
    autoRefreshToken: false,
  },
});
