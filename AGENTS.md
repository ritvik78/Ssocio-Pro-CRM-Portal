# AGENTS.md

## Workflow rules

- **Always push to GitHub after finishing a change.** When the user asks for an update or a fix, verify the work (lint/build), then commit and push to `origin/main` yourself. Do not wait to be asked.
- Use a clear, concise commit message that describes the change. Follow the existing single-line commit style in this repo.
- Never commit `.env`, `.env.local`, `SUPABASE_SECRET_KEY`, `SMTP_USER`/`SMTP_PASS`, or any other secret. The Supabase publishable key and URL are public and safe to commit.
- Before committing, review `git status` and `git diff`; stage only the intended files.