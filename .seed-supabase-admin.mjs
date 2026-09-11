import "dotenv/config";
import pg from "pg";

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  max: 2,
});

try {
  const sql = [
    "delete from auth.identities where email = 'admin@gmail.com';",
    "delete from auth.users where email = 'admin@gmail.com';",
    "with new_id as (select gen_random_uuid() as uid)",
    ", new_user as (",
    "  insert into auth.users (",
    "    instance_id, id, aud, role, email,",
    "    encrypted_password,",
    "    email_confirmed_at, created_at, updated_at,",
    "    raw_app_meta_data, raw_user_meta_data,",
    "    confirmation_token, recovery_token,",
    "    email_change_token_new, email_change,",
    "    phone_change, phone_change_token,",
    "    email_change_token_current, reauthentication_token",
    "  ) select ",
    "    '00000000-0000-0000-0000-000000000000', uid,",
    "    'authenticated', 'authenticated',",
    "    'admin@gmail.com',",
    "    crypt('admin@123', gen_salt('bf', 10)),",
    "    now(), now(), now(),",
    "    '{\"provider\":\"email\",\"providers\":[\"email\"]}',",
    "    jsonb_build_object(",
    "      'sub', uid::text,",
    "      'email', 'admin@gmail.com',",
    "      'email_verified', true,",
    "      'phone_verified', false,",
    "      'name', 'Admin',",
    "      'role', 'Ops / Admin'",
    "    ),",
    "    '', '', '', '', '', '', '', ''",
    "  from new_id",
    "  returning id",
    ") insert into auth.identities (",
    "  id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at",
    ") select",
    "  gen_random_uuid(), uid, uid,",
    "  jsonb_build_object(",
    "    'sub', uid::text,",
    "    'email', 'admin@gmail.com',",
    "    'email_verified', true,",
    "    'phone_verified', false",
    "  ),",
    "  'email', now(), now(), now()",
    "from new_id;",
  ].join("");
  await pool.query(sql);
  const res = await pool.query(
    "select email, email_confirmed_at is not null as confirmed, raw_user_meta_data->>'role' as role from auth.users where email = 'admin@gmail.com'",
  );
  console.log("SEEDED:", JSON.stringify(res.rows));
} catch (error) {
  console.error("SEED FAILED:", error.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}