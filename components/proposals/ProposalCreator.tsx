'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

type CostEstimate = {
  venue: number;
  catering: number;
  transport: number;
  misc: number;
  total: number;
  currency: string;
};

type SavedProposalPreview = {
  proposalId: string;
  createdAt?: string;
  status?: string;
  promptPreview?: string;
  recommendedVenue?: { placeId?: string; name?: string; rationale?: string } | null;
  costEstimate?: CostEstimate | null;
};

const QUICK_TEMPLATES = [
  {
    label: 'Team Offsite',
    prompt:
      'Plan a 2-day offsite for 60 people with workshops and team bonding. Budget is $50k. Prefer modern spaces with breakout rooms and easy airport access.',
    destinationHint: 'Austin, TX',
  },
  {
    label: 'Leadership Retreat',
    prompt:
      'Create a premium 3-day leadership retreat for 25 executives with strategy sessions, wellness blocks, and private dining. Budget is $80k.',
    destinationHint: 'Napa Valley, CA',
  },
  {
    label: 'Product Kickoff',
    prompt:
      'Suggest a 2-day product kickoff for 90 participants with plenary sessions, demos, and collaborative breakouts. Budget is $70k.',
    destinationHint: 'Seattle, WA',
  },
];

function formatDateLabel(value: string | undefined) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ProposalCreator() {
  const { user } = useUser();
  const router = useRouter();

  const [prompt, setPrompt] = useState('');
  const [destinationHint, setDestinationHint] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [recentProposals, setRecentProposals] = useState<SavedProposalPreview[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);

  async function loadRecentProposals() {
    setLoadingRecent(true);
    try {
      const res = await fetch('/api/proposals', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) return;
      setRecentProposals(Array.isArray(data?.proposals) ? data.proposals : []);
    } catch {
      // Keep the panel non-blocking if list fetch fails.
    } finally {
      setLoadingRecent(false);
    }
  }

  useEffect(() => {
    loadRecentProposals();
  }, []);

  async function onGenerate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');

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

      const nextProposalId = String(data?.proposalId || '');
      if (!nextProposalId) throw new Error('Proposal generated but ID was missing.');

      router.push(`/proposals/${nextProposalId}`);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const proposalsThisWeek = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return recentProposals.filter((p) => {
      if (!p.createdAt) return false;
      const t = new Date(p.createdAt).getTime();
      return !Number.isNaN(t) && t >= weekAgo;
    }).length;
  }, [recentProposals]);

  const firstName = user?.firstName || user?.fullName?.split(' ')[0] || 'there';

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">Dashboard</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
              Welcome back, {firstName}
            </h1>
            <p className="text-zinc-300 mt-2 text-sm md:text-base">
              Build venue proposals faster with guided prompts and live venue discovery.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center md:min-w-[300px]">
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-lg font-semibold text-white">{recentProposals.length}</div>
              <div className="text-[11px] text-zinc-400">Saved</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-lg font-semibold text-white">{proposalsThisWeek}</div>
              <div className="text-[11px] text-zinc-400">This week</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/20 px-3 py-2">
              <div className="text-sm font-semibold text-white">
                {formatDateLabel(recentProposals[0]?.createdAt)}
              </div>
              <div className="text-[11px] text-zinc-400">Last run</div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-semibold tracking-tight">Create an Offsite Proposal</h2>
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
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_TEMPLATES.map((template) => (
                <button
                  key={template.label}
                  type="button"
                  onClick={() => {
                    setPrompt(template.prompt);
                    setDestinationHint(template.destinationHint);
                  }}
                  className="text-xs rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-zinc-200 hover:bg-white/10 transition-colors"
                >
                  {template.label}
                </button>
              ))}
            </div>
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
            {loading ? 'Generating and opening proposal...' : 'Generate venue proposal'}
          </button>

          <div className="text-xs text-zinc-400">
            Uses live venue data and AI recommendations tailored to your event brief.
          </div>

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

      <section className="bg-white/5 border border-white/10 rounded-xl p-5 md:p-6">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-zinc-200">Recent proposals</h3>
          <Link href="/proposals" className="text-xs text-zinc-300 underline underline-offset-4">
            View all
          </Link>
        </div>

        {loadingRecent ? <div className="text-sm text-zinc-400 mt-3">Loading recent proposals...</div> : null}

        {!loadingRecent && recentProposals.length === 0 ? (
          <div className="mt-3 text-sm text-zinc-400">No saved proposals yet. Generate your first one above.</div>
        ) : null}

        {!loadingRecent && recentProposals.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {recentProposals.slice(0, 3).map((item) => (
              <Link
                key={item.proposalId}
                href={`/proposals/${item.proposalId}`}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 hover:bg-white/10 transition-colors"
              >
                <div className="text-sm text-white font-medium">
                  {item.recommendedVenue?.name || 'Venue recommendation'}
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  {formatDateLabel(item.createdAt)} • {item.promptPreview || 'No prompt preview'}
                </div>
              </Link>
            ))}
          </div>
        ) : null}
      </section>
    </div>
  );
}

