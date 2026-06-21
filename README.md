# ERP Globalize

Production-oriented ERP application for translation operations, sales, billing, finance, staff management, document preparation, and WhatsApp CRM.

## Runtime Setup

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and set production values.
3. Set `AUTH_SECRET` to a long random value.
4. Set `DB_PATH` to persistent storage, for example `./data/database.sqlite`.
5. For a new database, set `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD`, and `INITIAL_ADMIN_NAME`. The bootstrap admin is created only when no profiles exist.
6. Run locally:
   ```bash
   npm run dev
   ```

## Production

Build and run:

```bash
npm run build
npm start
```

Application data is stored server-side in SQLite through `DB_PATH`. Runtime database files, local secrets, and generated build artifacts are intentionally excluded from source control.

## Configuration

All credentials and external service settings must be supplied via environment variables:

- `AUTH_SECRET`
- `DB_PATH`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`
- `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_VERIFY_TOKEN`
- `GEMINI_API_KEY`, `GEMINI_MODEL`

The server exposes `/healthz` for uptime checks and logs each request with method, path, status, and latency.
