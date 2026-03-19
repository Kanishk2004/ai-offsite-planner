'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

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

function formatStatusLabel(status: string | undefined) {
  const value = (status || 'draft').trim().toLowerCase();
  if (!value) return 'Draft';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function getStatusClasses(status: string | undefined) {
  const value = (status || 'draft').trim().toLowerCase();
  if (value === 'approved' || value === 'completed') {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30';
  }
  if (value === 'in_review' || value === 'review') {
    return 'bg-amber-500/15 text-amber-300 border-amber-400/30';
  }
  return 'bg-blue-500/15 text-blue-300 border-blue-400/30';
}

function formatShortDate(value: string | Date | undefined) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProposalsList() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [proposals, setProposals] = useState<ProposalPreview[]>([]);

  useEffect(() => {
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
  }, []);

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

  const totalCount = cards.length;
  const withBudgetCount = cards.filter((c) => Boolean(c.displayTotal)).length;
  const latestCreatedAt = cards[0]?.createdAt;

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent p-5 md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">Proposals</div>
            <h1 className="text-2xl md:text-3xl font-semibold text-white mt-1">Saved proposals</h1>
            <p className="text-zinc-300 text-sm mt-1">Revisit, export, and share your latest offsite plans.</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center md:min-w-[320px]">
            <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <div className="text-lg font-semibold text-white">{totalCount}</div>
              <div className="text-[11px] text-zinc-400">Total</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <div className="text-lg font-semibold text-white">{withBudgetCount}</div>
              <div className="text-[11px] text-zinc-400">With budget</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/25 px-3 py-2">
              <div className="text-sm font-semibold text-white">{formatShortDate(latestCreatedAt)}</div>
              <div className="text-[11px] text-zinc-400">Last update</div>
            </div>
          </div>
        </div>
      </section>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-semibold text-white">Your proposal library</h2>
          <p className="text-zinc-300 text-sm mt-1">Open any proposal to review details or export a PDF.</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-xl border border-white/10 bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-95 transition-opacity"
        >
          Create new
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-white/10 bg-white/5 p-5 animate-pulse">
              <div className="h-5 w-24 bg-white/10 rounded" />
              <div className="mt-4 h-5 w-2/3 bg-white/10 rounded" />
              <div className="mt-2 h-4 w-full bg-white/10 rounded" />
              <div className="mt-2 h-4 w-5/6 bg-white/10 rounded" />
              <div className="mt-6 h-4 w-1/2 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      ) : null}
      {error ? <div className="p-3 rounded-lg bg-red-500/10 text-red-300 text-sm border border-red-500/20">{error}</div> : null}

      {!loading && !error && cards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 p-8 text-center">
          <div className="text-white font-semibold text-lg">No proposals yet</div>
          <p className="text-zinc-300 text-sm mt-2">Create your first proposal to start building your offsite plan library.</p>
          <div className="mt-5">
            <Link
              href="/dashboard"
              className="inline-flex rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black hover:opacity-95 transition-opacity"
            >
              Create first proposal
            </Link>
          </div>
        </div>
      ) : null}

      {cards.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((p) => {
            const date = formatShortDate(p.createdAt);
            return (
              <Link
                key={p.proposalId}
                href={`/proposals/${p.proposalId}`}
                className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(165deg,rgba(255,255,255,0.09),rgba(255,255,255,0.03))] p-5 hover:border-white/20 hover:bg-white/10 transition-all"
              >
                <div className="pointer-events-none absolute right-0 top-0 h-20 w-20 bg-[var(--accent)]/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div
                      className={[
                        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium tracking-wide uppercase',
                        getStatusClasses(p.status),
                      ].join(' ')}
                    >
                      {formatStatusLabel(p.status)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-400 text-xs">Created</div>
                    <div className="text-white font-semibold mt-1 text-sm">{date}</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="text-white font-semibold text-lg leading-tight">
                    {p.recommendedVenue?.name || 'Venue recommendation TBD'}
                  </div>
                  {p.recommendedVenue?.rationale ? (
                    <div className="text-zinc-300 text-sm mt-2 leading-relaxed">
                      {p.recommendedVenue.rationale}
                    </div>
                  ) : null}
                </div>

                {p.promptPreview ? (
                  <div className="mt-3 text-xs text-zinc-400 leading-relaxed">
                    Brief: {p.promptPreview}
                    {p.promptPreview.length >= 130 ? '...' : ''}
                  </div>
                ) : null}

                {p.displayTotal ? (
                  <div className="mt-5 rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-200">
                    Estimated total:{' '}
                    <span className="font-bold text-white">{p.displayTotal}</span>
                  </div>
                ) : null}

                <div className="mt-4 text-xs font-medium text-[var(--accent)] opacity-90 group-hover:opacity-100 transition-opacity">
                  Open full proposal
                </div>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

