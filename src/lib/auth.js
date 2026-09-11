import { supabase } from "./supabase";

const normalizeUser = (authUser) => {
  const meta = authUser.user_metadata || {};
  return {
    username: meta.name || authUser.email.split("@")[0],
    email: authUser.email,
    role: meta.role || "Ops / Admin",
  };
};

export const loginUser = async (email, password) => {
  if (!supabase) throw new Error("Supabase auth is not configured on this site.");
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
  return { user: normalizeUser(data.user) };
};

export const signupUser = async (email, password, role, name = "") => {
  if (!supabase) throw new Error("Supabase auth is not configured on this site.");
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name: name.trim() || email.split("@")[0], role } },
  });
  if (error) throw new Error(error.message);
  return {
    user: data.session ? normalizeUser(data.user) : null,
    requiresEmailConfirmation: !data.session,
  };
};

export const logoutUser = async () => {
  if (!supabase) return;
  await supabase.auth.signOut();
};