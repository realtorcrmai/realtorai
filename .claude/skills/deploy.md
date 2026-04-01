# Deploy Skill — Realtors360 CRM

Run this skill to build and deploy all services locally.

## Services

| Service | Port | Directory | Command |
|---------|------|-----------|---------|
| CRM (Next.js) | 3000 | `.` (repo root) | `npm run dev` |
| Voice Agent | 8768 | `voice_agent/server/` | `python voice_agent/server/main.py` |
| Form Server | 8767 | Python server | `python server.py` |
| Website Agent | 8769 | `realtors360-agent/` | `npm run dev` (optional, separate service) |

## Steps

### 1. Kill existing servers

```bash
lsof -ti :3000 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti :8768 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti :8767 2>/dev/null | xargs kill -9 2>/dev/null
lsof -ti :8769 2>/dev/null | xargs kill -9 2>/dev/null
sleep 1
```

### 2. Pull latest code

```bash
git pull origin dev
```

### 3. Install dependencies

```bash
npm install
```

### 4. Run new Supabase migrations

Check for unapplied migrations and run them.

> **Note:** `SUPABASE_ACCESS_TOKEN` must be set as an environment variable or in `.env.local`. Never hardcode it.

```bash
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN \
npx supabase db query --linked --output json \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename"
```

Then run any new migration files in `supabase/migrations/` that created tables not yet in the database:

```bash
SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN \
npx supabase db query --linked -f supabase/migrations/<new_migration>.sql
```

### 5. Build CRM

```bash
npm run build
```

If build fails, fix TypeScript errors before proceeding.

### 6. Start CRM (port 3000)

```bash
npm run dev &>/tmp/crm-server.log &

# Wait for ready
for i in $(seq 1 20); do
  grep -q "Ready in" /tmp/crm-server.log 2>/dev/null && break
  sleep 2
done
```

Verify: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/auth/csrf` should return 200.

### 7. Start Voice Agent (port 8768) — Optional

Only needed if working on voice agent features:

```bash
source voice_agent/venv/bin/activate
python voice_agent/server/main.py &>/tmp/voice-agent-server.log &
```

Verify: `curl -s http://localhost:8768/api/health` should return 200.

### 7b. Start Website Agent (port 8769) — Optional

Only needed if working on website generation features (separate service):

```bash
cd ./realtors360-agent
npm install
npm run dev &>/tmp/agent-server.log &
```

Verify: `curl -s http://localhost:8769/` should return HTML.

### 8. Run /test

After all services are running, execute the test skill to validate everything:

```
/test
```

### 9. Commit and push to dev

```bash
git add -A
git commit -m "your commit message

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
git push origin dev
```

**Never push directly to main.** To release, create a PR from dev → main.

## Environment Variables

Required in `realestate-crm/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://ybgiljuclpsuhbmdhust.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<secret>
ANTHROPIC_API_KEY=<key>
RESEND_API_KEY=<key>
RESEND_FROM_EMAIL=onboarding@resend.dev
DEMO_EMAIL=demo@realestatecrm.com
DEMO_PASSWORD=demo1234
```

## Troubleshooting

- **Port in use:** `lsof -ti :3000 | xargs kill -9`
- **Build fails on missing module:** `npm install <module-name>`
- **Supabase migration fails:** Check if prerequisite tables exist, run earlier migrations first
- **Server hangs on first request:** Turbopack is compiling — wait up to 30s
- **Push rejected:** Pull first with `git pull origin dev --rebase`
