'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';

type VenueCandidate = {
  placeId: string;
  name: string;
  address: string;
  rating?: number;
  priceLevel?: number;
  websiteUri?: string;
};

type CostEstimate = {
  venue: number;
  catering: number;
  transport: number;
  misc: number;
  total: number;
  currency: string;
};

type Proposal = {
  recommendedVenue?: { placeId: string; name: string; rationale: string } | null;
  alternativeVenues?: { placeId: string; name: string; reason: string }[];
  agendaSkeleton?: { day1: string[]; day2: string[] };
  cateringNotes?: string;
  logisticsTips?: string[];
  costEstimate?: CostEstimate;
};

type Intent = {
  headcount?: number | null;
  budget?: number | null;
  currency?: string | null;
  dateRange?: { start: string; end: string } | null;
  location?: string | null;
  atmosphere?: string | null;
};

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (typeof value !== 'number') return null;
  try {
    const cur = currency || 'USD';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || 'USD'} ${value}`;
  }
}

export default function ProposalCreator() {
  const { user } = useUser();

  const [prompt, setPrompt] = useState('');
  const [destinationHint, setDestinationHint] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [proposalId, setProposalId] = useState<string | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [intent, setIntent] = useState<Intent | null>(null);
  const [venues, setVenues] = useState<VenueCandidate[]>([]);

  async function onGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setProposalId(null);
    setProposal(null);
    setIntent(null);
    setVenues([]);

    if (!prompt.trim()) {
      setError('Please enter an event description.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/proposals/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          prompt: prompt.trim(),
          plannerName: user?.fullName || user?.firstName || 'Anonymous',
          destinationHint: destinationHint.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to generate proposal.');

      setProposalId(data.proposalId);
      setProposal(data.proposal as Proposal);
      setIntent(data.intent as Intent);
      setVenues((data.venues || []) as VenueCandidate[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const recommended = proposal?.recommendedVenue || null;
  const cost = proposal?.costEstimate || null;
  const alternatives = proposal?.alternativeVenues || [];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Create an Offsite Proposal
          </h1>
          <p className="text-zinc-300 mt-1 text-sm md:text-base">
            Describe your event in plain language. We’ll infer intent, discover real venues, and generate a structured plan.
          </p>
        </div>
        <div className="hidden md:flex items-center gap-2">
          <Link
            href="/proposals"
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10 transition-colors"
          >
            View saved
          </Link>
        </div>
      </div>

      <form onSubmit={onGenerate} className="bg-white/5 border border-white/10 rounded-xl p-5 md:p-6">
        <div className="grid gap-4 md:grid-cols-1">
          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-1">
              Event description
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full min-h-28 bg-black/40 border border-white/10 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Example: Offsite for 60 people, 2 days, budget $50k, modern indoor/outdoor, team building + workshops, rooms for breakouts."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-200 mb-1">
              Optional destination hint (city/region)
            </label>
            <input
              value={destinationHint}
              onChange={(e) => setDestinationHint(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="e.g. Austin, TX or Napa Valley"
            />
          </div>

          {error ? (
            <div className="p-3 rounded-lg bg-red-500/10 text-red-300 text-sm border border-red-500/20">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-[var(--accent)] text-black font-semibold hover:opacity-95 disabled:opacity-60 transition-opacity"
          >
            {loading ? 'Generating...' : 'Generate venue proposal'}
          </button>

          <div className="md:hidden">
            <Link
              href="/proposals"
              className="text-sm text-zinc-200 underline underline-offset-4"
            >
              View saved proposals
            </Link>
          </div>
        </div>
      </form>

      {proposalId && proposal ? (
        <section className="bg-white/5 border border-white/10 rounded-xl p-5 md:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-white mb-1">Recommended venue</h2>
              <div className="text-white font-medium">{recommended?.name || 'TBD'}</div>
              {recommended?.rationale ? (
                <p className="text-zinc-300 text-sm mt-2">{recommended.rationale}</p>
              ) : null}
            </div>

            <div className="text-sm text-right">
              {cost?.total != null ? (
                <div className="text-zinc-200">
                  Estimated total:{' '}
                  <span className="font-bold text-white">
                    {formatMoney(cost.total, cost.currency)}
                  </span>
                </div>
              ) : null}
              <div className="mt-3">
                <Link
                  href={`/proposals/${proposalId}`}
                  className="inline-flex items-center gap-2 text-[var(--accent)] font-semibold hover:opacity-90"
                >
                  Open full proposal
                </Link>
              </div>
            </div>
          </div>

          {alternatives.length ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">Alternative options</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {alternatives.slice(0, 4).map((v) => (
                  <div
                    key={v.placeId}
                    className="border border-white/10 rounded-lg p-3 bg-black/20"
                  >
                    <div className="font-medium text-white">{v.name}</div>
                    {v.reason ? (
                      <div className="text-sm text-zinc-300 mt-1">{v.reason}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {intent ? (
            <details className="mt-6">
              <summary className="cursor-pointer text-sm font-medium text-zinc-200">
                View extracted intent
              </summary>
              <pre className="mt-3 bg-black/40 border border-white/10 rounded-lg p-3 overflow-auto text-xs text-zinc-200">
                {JSON.stringify(intent, null, 2)}
              </pre>
            </details>
          ) : null}

          {Array.isArray(venues) && venues.length ? (
            <div className="mt-4 text-xs text-zinc-400">
              Searched {venues.length} venue candidates.
            </div>
          ) : null}
        </section>
      ) : null}

      {proposalId && !proposal ? (
        <div className="text-sm text-zinc-300">Proposal generation is in progress.</div>
      ) : null}
    </div>
  );
}

