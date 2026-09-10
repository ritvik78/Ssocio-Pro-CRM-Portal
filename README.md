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
