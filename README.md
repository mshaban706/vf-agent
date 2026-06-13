# VF Agent Command Center

**Valiant Firm AI Workforce Operating System** — A premium multi-agent AI command center for digital marketing, SEO, paid ads, automation, reporting, and client workflows.

![Phase 1 MVP](https://img.shields.io/badge/Phase-1%20MVP-gold)
![Electron](https://img.shields.io/badge/Electron-34-blue)
![NestJS](https://img.shields.io/badge/NestJS-11-red)
![React](https://img.shields.io/badge/React-19-61DAFB)

## Architecture

```
vf-agent-command-center/
├── apps/
│   ├── desktop/          # Electron + React + Vite (sci-fi command center UI)
│   └── api/              # NestJS backend (agent orchestrator, WebSockets)
├── packages/
│   └── shared/           # Shared TypeScript types, agent definitions
├── supabase/
│   ├── migrations/       # PostgreSQL schema with pgvector
│   └── seed.sql          # Agent & tool catalog seed data
└── docker-compose.yml    # Redis (Phase 2 job queue)
```

## Phase 1 Features (MVP)

- Electron + React desktop app with sci-fi Valiant Firm UI
- Supabase authentication (sign up / sign in)
- Client workspaces and client management
- 12-agent directory with capabilities and permissions
- Chat command input with Manager Agent orchestration
- Multi-agent task pipeline (Manager → SEO → Keyword → Content → QA)
- Kanban task board with status columns
- Live agent logs via WebSocket streaming
- Task detail page with pipeline, outputs, and QA scores
- API key settings for AI providers
- Approval center (human-in-the-loop safety layer)
- Full audit logging

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron 34, React 19, TypeScript, Vite |
| UI | Tailwind CSS, Framer Motion, Lucide Icons |
| Backend | NestJS 11, Socket.io WebSockets |
| Database | Supabase (PostgreSQL + pgvector) |
| AI | OpenAI (with mock fallback), multi-provider ready |
| Jobs | Redis + BullMQ (Phase 2) |
| Automation | Playwright, MCP tools (Phase 2) |
| Visual | Phaser pixel office (Phase 3) |

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- **Supabase** project ([supabase.com](https://supabase.com))
- **OpenAI API key** (optional — mock AI works without it)

## Quick Start

### 1. Clone and install

```bash
cd "VF AI Agent"
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
OPENAI_API_KEY=sk-...   # optional
```

Also copy env to the desktop app:

```bash
cp .env.example apps/desktop/.env
```

### 3. Set up Supabase database

1. Create a new Supabase project
2. Go to **SQL Editor**
3. Run `supabase/migrations/001_initial_schema.sql`
4. Run `supabase/seed.sql`

### 4. Build shared package

```bash
npm run build -w @vf/shared
```

### 5. Start development

```bash
# Terminal 1 — API server
npm run dev:api

# Terminal 2 — Desktop app (Electron + Vite)
npm run dev:desktop
```

Or run both concurrently:

```bash
npm run dev
```

The API runs at `http://localhost:4000` and the desktop app at `http://localhost:5173`.

### 6. First use

1. Open the app and **Sign Up** with your email
2. A workspace is auto-created on first login (or create one at Workspaces)
3. Add a client (e.g., domain: `polarinsulation.us`, radius: 150 miles)
4. Type a command in the Command Center:
   > "Do complete SEO research for polarinsulation.us within a 150-mile radius."
5. Watch agents work in real-time on the Task Detail page

## Agent Workforce

| Agent | Role | Phase |
|-------|------|-------|
| Manager Agent | Orchestrator — plans, assigns, synthesizes | 1 |
| SEO Strategy Agent | Topical maps, gap analysis, AEO/GEO | 1 |
| Keyword Research Agent | Local, intent, location-wise keywords | 1 |
| Content SEO Agent | Service pages, city pages, EEAT | 1 |
| QA Agent | Quality scoring (95+ Valiant Firm standard) | 1 |
| Competitor Research Agent | Gap reports, ranking analysis | 1* |
| Technical SEO Agent | Crawl audits, schema, indexation | 1* |
| Local SEO / GBP Agent | GBP optimization, review templates | 1* |
| Google Ads Agent | Campaign structure, ad copy | 1* |
| CRO Agent | Landing page conversion optimization | 1* |
| Reporting Agent | Monthly SEO reports | 2 |
| Automation Agent | Sheets, Gmail, WordPress, CRM | 2 |

*\* Defined in catalog; activated by Manager Agent based on command intent.*

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/signup` | Create account |
| POST | `/api/v1/auth/signin` | Sign in |
| GET | `/api/v1/auth/me` | Current user profile |
| GET | `/api/v1/workspaces` | List workspaces |
| POST | `/api/v1/workspaces` | Create workspace |
| GET | `/api/v1/clients?workspace_id=` | List clients |
| POST | `/api/v1/clients` | Create client |
| GET | `/api/v1/agents` | Agent catalog |
| POST | `/api/v1/commands/execute` | Execute AI command |
| GET | `/api/v1/tasks?workspace_id=` | List tasks |
| GET | `/api/v1/tasks/:id` | Task detail |
| GET | `/api/v1/tasks/:id/logs` | Agent logs |
| GET | `/api/v1/settings/api-keys` | List API keys |
| POST | `/api/v1/settings/api-keys` | Save API key |
| GET | `/api/v1/approvals` | Pending approvals |

**WebSocket:** `ws://localhost:4000/events` — subscribe to task events with `subscribe_task`.

## Safety Model

- **Never delete files** without confirmation
- **Never send emails** without approval
- **Never publish WordPress** without approval
- **Never launch ads** without approval
- Every tool action is logged to `audit_logs`
- Each agent has permission scopes
- Sandbox mode enabled by default (`SANDBOX_MODE=true`)

## Roadmap

### Phase 2
- Voice commands (Whisper STT)
- Tool integrations (Google Sheets, WordPress, Gmail)
- Browser automation (Playwright)
- Reporting module
- Redis/BullMQ background jobs

### Phase 3
- Phaser Agent Town (pixel office visual mode)
- Multi-agent visual collaboration
- MCP tool marketplace
- Local model support (Ollama)
- Full desktop automation

## Build for Production

```bash
npm run build
npm run build:desktop   # Creates Electron installer in apps/desktop/release/
```

## License

Proprietary — Valiant Firm. All rights reserved.
