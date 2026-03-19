# AI Event Concierge Platform

AI Event Concierge Platform is a Next.js application that helps planners generate corporate offsite proposals from a natural-language brief.

The app:
- extracts structured intent from a user prompt,
- discovers real venues via Google Places,
- generates a structured recommendation with OpenAI,
- stores proposals in MongoDB,
- and supports PDF export for stakeholder sharing.

## Tech Stack

- Next.js 16 (App Router)
- React 19
- Clerk (authentication)
- OpenAI API (intent + proposal generation)
- Google Places Text Search API (venue discovery)
- MongoDB + Mongoose (persistence + venue cache)
- PDFKit (proposal PDF export)
- Tailwind CSS 4

## Core Flow

1. User signs in with Clerk and opens Dashboard.
2. User submits an event brief (and optional destination hint).
3. `POST /api/proposals/generate` runs a 3-stage pipeline:
	 - Stage 1: OpenAI extracts structured intent JSON.
	 - Stage 2: app queries Google Places using generated searches, with MongoDB cache lookup first.
	 - Stage 3: OpenAI generates a structured proposal using intent + discovered venues.
4. Proposal is saved in MongoDB under the signed-in user.
5. User is redirected to proposal detail page.
6. User can review alternatives, agenda, costs, and export PDF.

## Architecture Overview

### Frontend Routes

- `/` landing page
- `/dashboard` proposal creation workspace (auth required)
- `/proposals` saved proposals list (auth required)
- `/proposals/[proposalId]` proposal detail + PDF export
- `/sign-in`, `/sign-up` Clerk auth routes

### API Routes

- `GET /api/health`
	- Basic health check
- `POST /api/proposals/generate`
	- Runs full AI + venue discovery pipeline and saves proposal
- `GET /api/proposals`
	- Returns latest proposals for current user (up to 20)
- `GET /api/proposals/[proposalId]`
	- Returns a single user-owned proposal
- `GET /api/proposals/[proposalId]/pdf`
	- Streams generated PDF for the proposal

### Auth and Access Control

- Clerk provider is configured in app layout.
- `/dashboard`, `/proposals`, and `/proposals/[proposalId]` are server-protected via Clerk `auth()` checks and redirect signed-out users to `/sign-in`.
- `proxy.js` enforces auth for proposal APIs (`/api/proposals*`).
- Handlers also perform explicit user checks as defense-in-depth.
- Proposal documents are scoped by `userId` in all fetches.

### Data Layer

MongoDB models (in `utils/db.js`):

- `Proposal`
	- stores prompt, planner info, extracted intent, venue snapshots, generated proposal JSON, status, and timestamps
- `VenueCache`
	- caches Google Places responses by query string with timestamp (7-day freshness window in generate flow)

Notable DB behavior:
- includes DNS fallback/retry logic for environments where SRV resolution may fail.

## AI Pipeline Details

### Stage 1: Intent Extraction

OpenAI parses prompt into structured JSON fields such as:
- headcount, budget, currency
- date range
- location and atmosphere
- venue keywords
- 2-3 Google Places text search queries

If `destinationHint` is provided, it is prioritized when building location/search queries.

### Stage 2: Venue Discovery

- For each generated query (max 3):
	- check `VenueCache` for recent cached result (within 7 days),
	- otherwise call Google Places Text Search API,
	- cache fresh results.
- Deduplicates venues by place ID and limits to 10 venues.

### Stage 3: Proposal Generation

OpenAI receives:
- extracted intent,
- normalized venue list.

It returns a structured proposal JSON containing:
- recommended venue + rationale,
- alternative venues,
- agenda skeleton,
- catering notes,
- logistics tips,
- cost estimate breakdown.

## PDF Export

`GET /api/proposals/[proposalId]/pdf` builds a PDF with:
- event summary
- recommended venue
- alternatives
- schedule outline
- catering/logistics
- cost estimate

`next.config.ts` is configured to keep `pdfkit` external and include AFM font data required at runtime.

## Environment Variables

Create `.env.local` from `.env.example` and fill in values:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/

OPENAI_API_KEY=
GOOGLE_PLACES_API_KEY=
MONGODB_URI=

# Optional: disable Mongo DNS fallback behavior
# MONGODB_DNS_FALLBACK=false
```

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Clerk project + keys
- OpenAI API key
- Google Places API key (Text Search enabled)
- MongoDB connection string

### Install and Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Available Scripts

- `npm run dev` start development server
- `npm run build` production build
- `npm run start` run production server
- `npm run lint` run ESLint

## Project Structure

```text
app/
	api/
		health/route.js
		proposals/
			route.js
			generate/route.js
			[proposalId]/route.js
			[proposalId]/pdf/route.js
	dashboard/page.tsx
	proposals/page.jsx
	proposals/[proposalId]/page.tsx
	sign-in/[[...sign-in]]/page.jsx
	sign-up/[[...sign-up]]/page.jsx
	layout.tsx
	page.tsx
components/
	layout/AppShell.tsx
	proposals/ProposalCreator.tsx
	proposals/ProposalsList.tsx
	proposals/ProposalDetail.tsx
utils/
	db.js
proxy.js
next.config.ts
```

## Notes for Developers

- Proposal API routes require an authenticated Clerk session.
- Proposals are user-scoped and cannot be fetched across users.
- Proposal list endpoint currently returns latest 20 records.
- Google Places result quality depends on generated query quality and API coverage.
- If MongoDB SRV lookup issues appear locally, DNS fallback logic is already built into DB connection.

## Health Check

Use this endpoint to verify server responsiveness:

- `GET /api/health` -> `{ "status": "OK" }`
