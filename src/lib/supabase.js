import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = supabaseUrl && supabasePublishableKey
  ? createClient(supabaseUrl, supabasePublishableKey)
  : null;

export const loadSupabaseSubmissions = async (audience) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("submissions")
    .select("payload")
    .eq("audience", audience)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((row) => row.payload);
};

export const saveSupabaseSubmissions = async (audience, rows) => {
  if (!supabase) return false;
  const { error: deleteError } = await supabase
    .from("submissions")
    .delete()
    .eq("audience", audience);
  if (deleteError) throw deleteError;
  if (!rows.length) return true;
  const { error } = await supabase.from("submissions").insert(
    rows.map((payload) => ({ audience, payload })),
  );
  if (error) throw error;
  return true;
};
