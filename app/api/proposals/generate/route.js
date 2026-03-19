/**
 * POST /api/proposals/generate
 *
 * 3-stage AI pipeline for generating corporate event venue proposals.
 *
 * Stage 1 — Intent Extraction (OpenAI):
 *   Parses the user's natural language prompt into a structured JSON object
 *   containing headcount, budget, location, atmosphere, venue keywords,
 *   and 2–3 targeted Google Places search query strings.
 *
 * Stage 2 — Venue Discovery (Google Places Text Search API):
 *   Fires each search query against Google Places, checks MongoDB venue_cache
 *   first (7-day TTL). Deduplicates results by place_id, collects up to 10 venues.
 *
 * Stage 3 — Proposal Generation (OpenAI):
 *   Feeds the extracted intent + venue list back to OpenAI to produce a full
 *   structured proposal: recommended venue, agenda skeleton, catering notes,
 *   logistics tips, and a cost estimate.
 *
 * Persists the final proposal to MongoDB `proposals` collection and returns
 * { proposalId, proposal } to the caller.
 */

import OpenAI from 'openai';
import { auth } from '@clerk/nextjs/server';
import { connectDB, Proposal, VenueCache } from '@/utils/db';

// ─── OpenAI client ────────────────────────────────────────────────────────────

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Stage 1: Intent extraction ───────────────────────────────────────────────

async function extractIntent(prompt, destinationHint) {
	const response = await openai.chat.completions.create({
		model: 'gpt-4o',
		messages: [
			{
				role: 'system',
				content: `You are an AI assistant that extracts structured event planning intent from natural language.
Return ONLY valid JSON with no prose, no markdown fences. Schema:
{
  "headcount": number,
  "budget": number,
  "currency": "USD" | "INR" | string,
  "dateRange": { "start": string, "end": string },
  "location": string,
  "atmosphere": string,
  "venueKeywords": string[],
  "googleSearchQueries": string[]
}
googleSearchQueries must contain 2-3 targeted Google Places search strings
inferred from the user's intent, e.g. "outdoor corporate retreat venue Napa Valley CA".
If a destinationHint is provided, prefer it as the location anchor and incorporate it into googleSearchQueries and location.
If any field cannot be inferred, use null.`,
			},
			{
				role: 'user',
				content: JSON.stringify({
					prompt,
					destinationHint: destinationHint || null,
				}),
			},
		],
		temperature: 0.2,
	});

	const raw = response.choices[0].message.content.trim();

	try {
		return JSON.parse(raw);
	} catch {
		throw new Error('Intent extraction failed: OpenAI returned invalid JSON.');
	}
}

// ─── Stage 2: Venue discovery ─────────────────────────────────────────────────

async function fetchVenuesForQuery(query) {
	const SEVEN_DAYS_AGO = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

	// Check cache first
	const cached = await VenueCache.findOne({
		queryKey: query,
		cachedAt: { $gte: SEVEN_DAYS_AGO },
	});

	if (cached) {
		console.log(`[venue_cache] HIT for: "${query}"`);
		return cached.places;
	}

	console.log(`[venue_cache] MISS — calling Google Places for: "${query}"`);

	let places = [];

	try {
		const res = await fetch(
			'https://places.googleapis.com/v1/places:searchText',
			{
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'X-Goog-Api-Key': process.env.GOOGLE_PLACES_API_KEY,
					'X-Goog-FieldMask':
						'places.id,places.displayName,places.formattedAddress,places.rating,places.priceLevel,places.websiteUri,places.photos',
				},
				body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
			},
		);

		if (!res.ok) {
			console.error(
				`[google_places] Non-2xx response (${res.status}) for query: "${query}"`,
			);
			return [];
		}

		const data = await res.json();
		places = data.places || [];

		// Upsert into cache
		await VenueCache.findOneAndUpdate(
			{ queryKey: query },
			{ queryKey: query, places, cachedAt: new Date() },
			{ upsert: true, new: true },
		);
	} catch (err) {
		console.error(`[google_places] Fetch error for query "${query}":`, err);
	}

	return places;
}

async function discoverVenues(googleSearchQueries) {
	const queries = (googleSearchQueries || []).slice(0, 3);
	const seen = new Set();
	const venues = [];

	for (const query of queries) {
		const results = await fetchVenuesForQuery(query);
		for (const place of results) {
			const id = place.id || place.place_id;
			if (id && !seen.has(id)) {
				seen.add(id);
				venues.push(place);
				if (venues.length >= 10) break;
			}
		}
		if (venues.length >= 10) break;
	}

	return venues;
}

// ─── Stage 3: Proposal generation ────────────────────────────────────────────

async function generateProposal(intent, venues) {
	const venueList = venues.map((v) => ({
		placeId: v.id || v.place_id,
		name: v.displayName?.text || v.name,
		address: v.formattedAddress,
		rating: v.rating,
		priceLevel: v.priceLevel,
		websiteUri: v.websiteUri || '',
	}));

	const response = await openai.chat.completions.create({
		model: 'gpt-4o',
		messages: [
			{
				role: 'system',
				content: `You are an expert corporate event planner. Given event requirements and a list of real venues,
generate a structured proposal. Return ONLY valid JSON with no prose, no markdown fences. Schema:
{
  "recommendedVenue": {
    "placeId": string,
    "name": string,
    "rationale": string
  },
  "alternativeVenues": [{ "placeId": string, "name": string, "reason": string }],
  "agendaSkeleton": {
    "day1": string[],
    "day2": string[]
  },
  "cateringNotes": string,
  "logisticsTips": string[],
  "costEstimate": {
    "venue": number,
    "catering": number,
    "transport": number,
    "misc": number,
    "total": number,
    "currency": string
  }
}`,
			},
			{
				role: 'user',
				content: JSON.stringify({ intent, venues: venueList }),
			},
		],
		temperature: 0.4,
	});

	const raw = response.choices[0].message.content.trim();

	try {
		return JSON.parse(raw);
	} catch {
		throw new Error(
			'Proposal generation failed: OpenAI returned invalid JSON.',
		);
	}
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req) {
	// 1. Parse request body
	let body;
	try {
		body = await req.json();
	} catch {
		return Response.json({ error: 'Invalid JSON body.' }, { status: 400 });
	}

	const { prompt, plannerName = 'Anonymous', destinationHint } = body;

	if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
		return Response.json({ error: 'prompt is required.' }, { status: 400 });
	}

	// 2. Connect to MongoDB
	try {
		await connectDB();
	} catch (err) {
		console.error('[mongodb] Connection error:', err);
		return Response.json(
			{ error: 'Database connection failed.' },
			{ status: 500 },
		);
	}

	// 2b. Auth (own proposals)
	let userId;
	try {
		const authResult = await auth();
		userId = authResult?.userId;
	} catch (err) {
		console.error('[clerk] auth error:', err);
	}
	if (!userId) {
		return Response.json({ error: 'Unauthorized' }, { status: 401 });
	}

	// 3. Stage 1 — Intent extraction
	let intent;
	try {
		intent = await extractIntent(prompt.trim(), destinationHint);
	} catch (err) {
		return Response.json({ error: err.message }, { status: 400 });
	}

	// 4. Stage 2 — Venue discovery
	const venues = await discoverVenues(intent.googleSearchQueries);

	// 5. Stage 3 — Proposal generation
	let proposalText;
	try {
		proposalText = await generateProposal(intent, venues);
	} catch (err) {
		return Response.json({ error: err.message }, { status: 400 });
	}

	// 6. Persist to MongoDB
	const venuesSnapshot = venues
		.map((v) => ({
			placeId: v.id || v.place_id,
			name: v.displayName?.text || v.name || '',
			address: v.formattedAddress || '',
			rating: v.rating,
			priceLevel: v.priceLevel,
			websiteUri: v.websiteUri || '',
		}))
		.filter((v) => Boolean(v.placeId));

	let saved;
	try {
		saved = await Proposal.create({
			userId,
			prompt: prompt.trim(),
			plannerName,
			status: 'draft',
			intent,
			venues: venuesSnapshot,
			venueIds: venuesSnapshot.map((v) => v.placeId),
			proposalText,
			proposal: proposalText,
			createdAt: new Date(),
			updatedAt: new Date(),
		});
	} catch (err) {
		console.error('[mongodb] Save error:', err);
		return Response.json(
			{ error: 'Failed to save proposal.' },
			{ status: 500 },
		);
	}

	// 7. Return response
	return Response.json(
		{
			proposalId: saved._id.toString(),
			proposal: proposalText,
			intent,
			venues: venues.map((v) => ({
				placeId: v.id || v.place_id,
				name: v.displayName?.text || v.name,
				address: v.formattedAddress,
				rating: v.rating,
				priceLevel: v.priceLevel,
				websiteUri: v.websiteUri || '',
			})),
		},
		{ status: 200 },
	);
}
