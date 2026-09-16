import { createClient } from "@supabase/supabase-js";

// The URL and publishable key are public by design (they are safe for any
// client). The env vars win when a build host sets them; these fallbacks
// guarantee every deployment of this client (GitHub Pages, Render, local,
// etc.) syncs to the same Supabase project even if the host omits the vars.
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL || "https://ybdlziufamgufmghmiou.supabase.co";
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_mMD0nZxfu-sL1DEqAtzG1w_D0jipHN9";

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
  if (!supabase) throw new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");
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

const supabaseConfiguredError = () =>
  new Error("Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.");

export const loadAppData = async (key) => {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("app_state")
    .select("payload")
    .eq("app_key", key)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data.map((row) => row.payload);
};

export const saveAppData = async (key, rows) => {
  if (!supabase) throw supabaseConfiguredError();
  const { error: deleteError } = await supabase
    .from("app_state")
    .delete()
    .eq("app_key", key);
  if (deleteError) throw deleteError;
  if (!rows.length) return true;
  const { error } = await supabase.from("app_state").insert(
    rows.map((payload) => ({ app_key: key, payload })),
  );
  if (error) throw error;
  return true;
};

const crmAssetsBucket = "crm-assets";

export const uploadCrmFile = async (folder, file, nameHint = "file") => {
  if (!supabase) return null;
  const extension = (file.name.split(".").pop() || "bin")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") || "bin";
  const safeName =
    String(nameHint || "file")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "file";
  const path = `${folder}/${safeName}-${Date.now()}.${extension}`;
  const { error } = await supabase.storage
    .from(crmAssetsBucket)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from(crmAssetsBucket).getPublicUrl(path);
  return data.publicUrl;
};

export const readFileAsDataUrl = async (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
