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

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
