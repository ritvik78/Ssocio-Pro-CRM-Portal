# React + Vite

## SMTP email service

Copy `.env.example` to `.env` and replace the placeholder values with credentials from your SMTP provider. Keep `.env` local and never commit it.

```powershell
Copy-Item .env.example .env
npm run api
```

Run the frontend separately in another terminal with `npm run dev`, or run both services with `npm run dev:full`. The email page checks `/api/email/status` before sending. A configured SMTP service must be reachable from the machine running `server.js`.

Required settings:

- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE` (`true` for SSL/TLS SMTP providers, otherwise `false`)
- `SMTP_USER`
- `SMTP_PASS`
- `MAIL_FROM`

## Supabase setup

This Vite app uses the browser Supabase client, so use Vite-prefixed variables rather than the Next.js `NEXT_PUBLIC_*` names. Copy `.env.example` to `.env.local`, add your Supabase project URL and publishable key, then run the SQL in `supabase-schema.sql` in the Supabase SQL Editor. Submission records will use Supabase when these variables and the table are available, with the existing API and local storage as a fallback.

The backend also supports `@supabase/server`. Set `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, and `SUPABASE_JWKS_URL` only in the Node host environment. Never expose `SUPABASE_SECRET_KEY` through `VITE_*` variables or commit it. The backend check is available at `/api/supabase/status`.

Authenticated clients can send a Supabase access token to `/api/auth/me` as `Authorization: Bearer <token>`. The endpoint verifies the token with the configured JWKS URL and returns the verified user claims.

For direct backend PostgreSQL access, set `DATABASE_URL` only on the Node host. Use `postgresql://postgres.YOUR_PROJECT_REF:YOUR_PASSWORD@aws-0-<region>.pooler.supabase.com:6543/postgres` (transaction pooler) as the template and percent-encode special characters in the password. The connection check is available at `/api/database/status`; the browser never receives this connection string.

## Prisma ORM

Prisma is configured in `prisma/schema.prisma` for the Supabase `submissions` and `users` tables. Set both `DATABASE_URL` (transaction pooler) and `DIRECT_URL` (session pooler for migrations) in the backend environment, then run:

```powershell
npx prisma generate
npx prisma db pull
```

Use `npx prisma migrate dev` only after the database password is configured and you are ready to manage schema migrations from this project. Percent-encode special characters in both connection-string passwords.

The backend exposes `/api/prisma/status` for a non-secret connection check. The Prisma client is created lazily and is never bundled into the browser build.

## Accounts & sign-in

The portal opens on a sign-in page on every visit. New visitors click **New here? Create an account** to register with a username and password; existing users use **Already a user? Log in** to sign back in. After signing in, the dashboard greets `Welcome <username>` and the sidebar shows the signed-in user and role.

Accounts are stored in the `users` table of the same Supabase Postgres database that holds submissions. Run the updated `supabase-schema.sql` in the Supabase SQL Editor to create it. The table holds `username` (unique), a `password_hash`, a `role`, and an optional `token_hash` for the active session.

Then add the backend database settings so the API can read and write accounts:

- `DATABASE_URL` (transaction pooler)
- `DIRECT_URL` (session pooler for migrations)

Passwords are hashed with Node's `scrypt` before being stored, and each signed-in session stores a random token hash in `users.token_hash`.

API endpoints:

- `POST /api/auth/signup` — create an account (`username`, `password` at least 6 characters, `role` one of `Ops / Admin`, `Brand`, `Influencer`)
- `POST /api/auth/login` — verify a username and password, returns `{ user, token }`
- `GET /api/auth/session` — verify a `Authorization: Bearer <token>` session
- `POST /api/auth/logout` — revoke the session token

On the frontend, set `VITE_API_URL` when the API is hosted separately (for example `https://your-email-api.example.com`); otherwise the app calls the same origin.

A fixed admin account is seeded for testing: **`admin@gmail.com`** with password **`admin@123`** (role `Ops / Admin`). You can also register new accounts with the **New here? Create an account** link; username and email-style identifiers are both accepted.

## Supabase MCP

The project MCP configuration is stored in `.mcp.json`. After installing the Claude CLI, authenticate the configured Supabase server from a regular terminal:

```powershell
claude /mcp
```

Select `supabase`, choose **Authenticate**, and complete the browser flow. The MCP URL contains only the project reference and feature flags; no secret key is stored in this repository.

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Production deployment

Deploy the project as one Node service so the same origin serves both the website and the email API.

Build command:

```text
npm run build
```

Start command:

```text
npm start
```

Add these environment variables in the hosting provider's secret settings:

```text
PORT=8080
CLIENT_ORIGIN=https://your-domain.example
SMTP_HOST=smtp.your-provider.example
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-smtp-username
SMTP_PASS=your-smtp-password
MAIL_FROM=Ssocio Pro <noreply@your-domain.example>
```

Use the port supplied by the hosting provider when one is required. The server also accepts `API_PORT` for local development. The provider must allow outbound SMTP connections, and the sender address should be verified with the SMTP provider. After deployment, open Email automation and confirm it shows `Email service ready` before sending a test message.

## GitHub Pages email connection

GitHub Pages hosts the frontend only. Deploy `server.js` to a Node host first, then add these repository variables at **Settings > Secrets and variables > Actions > Variables**:

```text
VITE_API_URL=https://your-email-api.example.com
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-key
```

Set the backend's `CLIENT_ORIGIN` to the exact GitHub Pages URL, for example `https://your-account.github.io/Ssocio-Pro-CRM-Portal`. Keep `SMTP_USER` and `SMTP_PASS` as backend-host secrets. Do not add them to GitHub Actions variables, frontend environment values, or committed files.
