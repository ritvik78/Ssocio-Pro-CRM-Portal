import { createAdminClient } from "@supabase/server/core";

let adminClient;

export const isSupabaseServerConfigured = () => Boolean(
  process.env.SUPABASE_URL && process.env.SUPABASE_SECRET_KEY,
);

export const getSupabaseAdmin = () => {
  if (!isSupabaseServerConfigured()) return null;
  adminClient ??= createAdminClient();
  return adminClient;
};
