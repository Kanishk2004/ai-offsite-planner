'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { SignInButton, useUser } from '@clerk/nextjs';

type RecommendedVenuePreview = {
  placeId: string;
  name: string;
  rationale?: string;
};

type ProposalPreview = {
  proposalId: string;
  createdAt?: string | Date;
  status?: string;
  promptPreview?: string;
  recommendedVenue?: RecommendedVenuePreview | null;
  costEstimate?: { total: number; currency: string } | null;
};

function formatMoney(value: number | null | undefined, currency: string | null | undefined) {
  if (typeof value !== 'number') return null;
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${cur} ${value}`;
  }
}

export default function ProposalsList() {
  const { isSignedIn } = useUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState<ProposalPreview[]>([]);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch('/api/proposals', { credentials: 'include' });
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || 'Failed to load proposals.');
        if (cancelled) return;
        setProposals(data?.proposals || []);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load proposals.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [isSignedIn]);

  const cards = useMemo(() => {
    return proposals.map((p) => {
      const total = p.costEstimate?.total;
      const currency = p.costEstimate?.currency;
      return {
        ...p,
        displayTotal: formatMoney(total, currency),
      };
    });
  }, [proposals]);

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-white font-semibold text-lg">Saved proposals</div>
        <p className="text-zinc-300 text-sm mt-2">Sign in to view your saved venue proposals.</p>
        <div className="mt-4">
          <SignInButton fallbackRedirectUrl="/dashboard" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Saved proposals</h1>
          <p className="text-zinc-300 text-sm mt-1">Revisit, export, and share your latest offsite plans.</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white hover:bg-white/10 transition-colors"
        >
          Create new
        </Link>
      </div>

      {loading ? <div className="text-zinc-300 text-sm">Loading...</div> : null}
      {error ? <div className="p-3 rounded-lg bg-red-500/10 text-red-300 text-sm border border-red-500/20">{error}</div> : null}

      {!loading && !error && cards.length === 0 ? (
        <div className="text-zinc-300 text-sm">
          No proposals yet. Create one from the dashboard.
        </div>
      ) : null}

      {cards.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map((p) => {
            const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '-';
            return (
              <Link
                key={p.proposalId}
                href={`/proposals/${p.proposalId}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 hover:bg-white/10 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-zinc-400 text-xs">Status</div>
                    <div className="text-white font-semibold mt-1">{p.status || 'draft'}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-400 text-xs">Created</div>
                    <div className="text-white font-semibold mt-1">{date}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-white font-semibold">
                    {p.recommendedVenue?.name || 'Venue recommendation TBD'}
                  </div>
                  {p.recommendedVenue?.rationale ? (
                    <div className="text-zinc-300 text-sm mt-1">{p.recommendedVenue.rationale}</div>
                  ) : null}
                </div>

                {p.displayTotal ? (
                  <div className="mt-4 text-sm text-zinc-200">
                    Estimated total:{' '}
                    <span className="font-bold text-white">{p.displayTotal}</span>
                  </div>
                ) : null}
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

