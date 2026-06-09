# WhatsChat AI

WhatsChat AI is a WhatsApp Business API inbox built with Next.js, Prisma, PostgreSQL, and AI-assisted automation. It gives a business team a shared inbox for WhatsApp conversations, lead tracking, message templates, media handling, knowledge-base powered AI replies, and WhatsApp API setup from one dashboard.

The app is designed for businesses that want to receive WhatsApp messages through the Meta WhatsApp Cloud API, manage leads inside a web inbox, and optionally let an AI assistant respond using configured business knowledge.

--

<img width="1600" height="677" alt="WhatsApp Image 2026-06-09 at 5 40 25 PM" src="https://github.com/user-attachments/assets/48ff70fe-a221-4226-972b-7516bab405ed" />

--

<img width="1600" height="727" alt="WhatsApp Image 2026-06-09 at 5 46 03 PM" src="https://github.com/user-attachments/assets/1ae2fedc-a3db-4e2b-a2a2-cfd716fc0da1" />

-- 

<img width="1312" height="869" alt="WhatsApp Image 2026-06-09 at 5 47 06 PM" src="https://github.com/user-attachments/assets/622d68e0-7405-4c9f-8d60-7425caefdc96" />

--

<img width="1600" height="727" alt="WhatsApp Image 2026-06-09 at 5 47 26 PM" src="https://github.com/user-attachments/assets/a3175c1b-53b9-4834-9f14-f939a3564df1" />

--

<img width="1600" height="730" alt="WhatsApp Image 2026-06-09 at 5 49 21 PM" src="https://github.com/user-attachments/assets/67f48c83-4b32-401d-b3d3-f1dec2fd3b89" />

--

<img width="1600" height="722" alt="WhatsApp Image 2026-06-09 at 5 31 48 PM" src="https://github.com/user-attachments/assets/e2330c1a-3285-499b-8b16-b17407d12725" />

--

<img width="1600" height="745" alt="WhatsApp Image 2026-06-09 at 5 39 01 PM" src="https://github.com/user-attachments/assets/506129a0-9f55-4d5c-a631-7a918fb6dcb2" />

--

## Features

### WhatsApp Inbox

- Central inbox for WhatsApp customer conversations.
- Conversation list with unread counts, status, tags, and last-message metadata.
- Full chat area for text and media messages.
- Support for customer, agent, AI, system, and internal-note message types.
- Conversation assignment and lead details through the lead panel.
- Handling mode controls for switching between AI and human handling.
- AI pause support per conversation.

### WhatsApp Business API Integration

- WhatsApp webhook verification through a per-user verify token.
- Incoming WhatsApp message ingestion through the Meta Graph API webhook.
- Delivery/read status updates for outbound WhatsApp messages.
- Outbound text messages.
- Outbound media messages using either hosted media URLs or base64 uploads to Meta.
- Template message sending with language and variable support.
- Duplicate-send protection for recent outbound agent messages.
- Retry handling for transient send failures and rate limits.
- Clear API error codes for common WhatsApp failures such as closed 24-hour window, expired token, paused template, missing config, and invalid WhatsApp phone number.

### AI Assistant

- AI auto-replies for inbound text messages when AI mode is enabled.
- Knowledge-base aware prompt construction.
- Conversation history included in AI context.
- Configurable global AI enablement and auto/manual mode.
- Per-conversation AI guardrails through `handling_mode`, `ai_paused`, and conversation status.
- AI-powered WhatsApp template generation from a business use case.
- Uses `DEEPSEEK_API_KEY` through the local LLM helper.

### Lead Management

- Lead fields stored directly on conversations, including:
  - Customer name, phone, email, and company.
  - Lead source and interest.
  - Budget.
  - Qualification score.
  - AI summary and suggested next action.
  - Appointment date and appointment status.
- Conversation statuses such as new, contacted, qualified, appointment booked, follow up, won, lost, and closed.

### Knowledge Base

- Business knowledge entries for AI support.
- Categories for company overview, services, pricing, FAQs, policies, products, team, custom, and general content.
- FAQ-style entries with question and answer fields.
- URL/source metadata and tags.
- Active/restricted flags for controlling which entries are available.

### Templates

- Local template records with name, display name, category, language, header, body, footer, variables, buttons, and Meta template ID.
- Template sync/status endpoints for WhatsApp template management.
- AI template generation following Meta naming and variable rules.
- Template send support through the WhatsApp Graph API.

### Team And Settings

- User authentication with NextAuth credentials.
- Password hashing with bcrypt.
- Team member records with roles, availability, permissions, working hours, and avatar metadata.
- App settings for WhatsApp, AI agent, calendar, notifications, and general configuration.
- Automation rule storage for triggers and actions.

## Tech Stack

- Next.js 14 App Router
- React 18
- TypeScript
- Tailwind CSS
- Prisma ORM
- PostgreSQL, commonly Supabase Postgres
- NextAuth credentials authentication
- Supabase client support for realtime/data integrations
- Meta WhatsApp Cloud API
- DeepSeek-compatible LLM integration through `lib/llm.ts`
- Radix UI primitives
- Lucide React icons

## Project Structure

```text
app/
  api/
    auth/                         Authentication endpoints
    entities/                     Generic entity CRUD API
    functions/                    WhatsApp, AI, template, and setup API functions
  ai-agent/                       AI agent configuration page
  inbox/                          WhatsApp inbox page
  knowledge/                      Knowledge base page
  leads/                          Leads page
  login/                          Login page
  settings/                       App settings page
  setup/                          WhatsApp setup page

components/
  inbox/                          Chat UI, lead panel, media preview, AI controls
  layout/                         Main app layout
  ui/                             Shared UI primitives

lib/
  api-client.ts                   Client-side API helpers
  auth.ts                         NextAuth configuration
  llm.ts                          LLM helper
  prisma.ts                       Prisma client singleton
  supabase.ts                     Supabase client setup
  utils.ts                        Shared utilities

prisma/
  schema.prisma                   Database schema
```

## Database Models

The Prisma schema includes these main tables:

- `users`: application users with role and authentication metadata.
- `conversations`: WhatsApp customer conversations and lead fields.
- `messages`: inbound/outbound chat messages, media references, statuses, and WhatsApp IDs.
- `user_wa_configs`: WhatsApp Business API credentials and webhook configuration per user.
- `message_templates`: local WhatsApp template records and Meta sync metadata.
- `knowledge_base`: AI knowledge source entries.
- `app_settings`: configurable app, WhatsApp, notification, calendar, and AI settings.
- `automation_rules`: stored automation triggers and actions.
- `team_members`: team users, roles, permissions, and availability.

## Requirements

- Node.js 18 or newer
- pnpm
- PostgreSQL database
- Meta WhatsApp Business / Cloud API app
- Supabase project if using the provided Supabase-oriented configuration
- DeepSeek API key for AI features

## Environment Variables

Create `.env` in the project root. You can use `.env.local.example` as the starting point.

```env
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"
DIRECT_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres"

NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

NEXTAUTH_SECRET="your-random-secret-min-32-chars"
NEXTAUTH_URL="http://localhost:3000"

DEEPSEEK_API_KEY="sk-..."

NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

`DIRECT_URL` is required because the Prisma datasource uses:

```prisma
directUrl = env("DIRECT_URL")
```

For simple local development it can often be the same as `DATABASE_URL`. For hosted providers that use connection pooling, `DATABASE_URL` is usually the pooled URL and `DIRECT_URL` should be the direct database connection URL.

## Installation

```bash
pnpm install
```

Generate the Prisma client:

```bash
pnpm db:generate
```

Push the schema to the database:

```bash
pnpm db:push
```

Start the development server:

```bash
pnpm dev
```

Open:

```text
http://localhost:3000
```

## Available Scripts

```bash
pnpm dev          # Start Next.js development server
pnpm build        # Build the production app
pnpm start        # Start the production server
pnpm lint         # Run Next.js linting
pnpm db:generate  # Generate Prisma client
pnpm db:push      # Push Prisma schema to the database
pnpm db:migrate   # Create and apply a development migration
pnpm db:studio    # Open Prisma Studio
```

## WhatsApp Setup Flow

1. Create a Meta developer app with WhatsApp enabled.
2. Create or connect a WhatsApp Business Account.
3. Get the WhatsApp phone number ID, WABA ID, and access token.
4. Add the credentials in the app setup/settings area.
5. Generate or set a webhook verify token.
6. Configure the Meta webhook callback URL to:

```text
https://your-domain.com/api/functions/whatsappWebhook
```

7. Subscribe the webhook to WhatsApp messages and message status events.
8. Verify the connection from the app.

For local webhook testing, expose the local server with a tunnel such as ngrok and use the tunnel URL as `NEXT_PUBLIC_APP_URL`.

## Important API Endpoints

- `POST /api/auth/register`: create a new user.
- `GET /api/auth/me`: return the current authenticated user.
- `GET /api/functions/whatsappWebhook`: WhatsApp webhook verification handshake.
- `POST /api/functions/whatsappWebhook`: inbound WhatsApp messages and status updates.
- `POST /api/functions/sendWhatsAppMessage`: send text, media, or template messages.
- `POST /api/functions/getWhatsAppMedia`: proxy/download WhatsApp media by media ID.
- `POST /api/functions/createOrUpdateWAConfig`: save WhatsApp API configuration.
- `POST /api/functions/verifyWhatsAppConnection`: validate WhatsApp credentials.
- `POST /api/functions/toggleAIMode`: change AI/human handling mode.
- `POST /api/functions/generateTemplateWithAI`: generate a WhatsApp template with AI.
- `POST /api/functions/createWhatsAppTemplate`: create a WhatsApp template.
- `POST /api/functions/syncWhatsAppTemplates`: sync templates from WhatsApp.
- `POST /api/functions/checkTemplateStatus`: check template approval/status.
- `POST /api/functions/deleteWhatsAppTemplate`: delete a template.

## AI Reply Behavior

The WhatsApp webhook can generate an AI reply when all of these are true:

- The inbound message is text.
- Global AI settings allow auto mode.
- The conversation handling mode is `ai`.
- The conversation is not paused with `ai_paused`.
- The conversation is not closed.

When replying, the app builds a prompt from:

- The configured AI system prompt.
- Active knowledge-base entries.
- Recent conversation history.
- The latest customer message.

The reply is sent through the WhatsApp Graph API and saved as an `ai` message.

## Security Notes

- Never commit `.env`, `.env.local`, access tokens, service-role keys, database URLs, or NextAuth secrets.
- Keep WhatsApp access tokens server-side only.
- Rotate a WhatsApp token if it was accidentally shared.
- Use long-lived system user tokens or a secure token refresh process for production.
- Use HTTPS for webhook URLs in production.
- Restrict database and Supabase service-role access.

## Deployment Notes

1. Add all environment variables to the hosting provider.
2. Use a production PostgreSQL database.
3. Run Prisma migrations or push the schema before serving traffic.
4. Set `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to the production domain.
5. Configure the Meta webhook callback to the production `/api/functions/whatsappWebhook` endpoint.
6. Verify the webhook in Meta Developer Console.

## Repository Status

This repository contains the application source code only. Local dependencies, build artifacts, generated caches, and private environment files are intentionally ignored.
