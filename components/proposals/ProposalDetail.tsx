'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SignInButton, useUser } from '@clerk/nextjs';

type ProposalDoc = {
  proposalId: string;
  prompt?: string;
  plannerName?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  intent?: IntentJson;
  proposal?: ProposalJson;
  venues?: VenueSnapshot[];
  venueIds?: string[];
};

type IntentJson = {
  headcount?: number | null;
  budget?: number | null;
  currency?: string | null;
  dateRange?: { start: string; end: string } | null;
  location?: string | null;
  atmosphere?: string | null;
};

type VenueSnapshot = {
  placeId: string;
  name?: string;
  address?: string;
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

type ProposalJson = {
  recommendedVenue?: { placeId: string; name: string; rationale: string } | null;
  alternativeVenues?: { placeId: string; name: string; reason?: string }[];
  agendaSkeleton?: { day1: string[]; day2: string[] };
  cateringNotes?: string;
  logisticsTips?: string[];
  costEstimate?: CostEstimate;
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

export default function ProposalDetail({ proposalId }: { proposalId: string }) {
  const { isSignedIn } = useUser();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [doc, setDoc] = useState<ProposalDoc | null>(null);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/proposals/${proposalId}`, { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load proposal.');
      setDoc(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load proposal.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!isSignedIn) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSignedIn, proposalId]);

  async function exportPdf() {
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/pdf`, {
        method: 'GET',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to export PDF.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposal-${proposalId}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export PDF.');
    } finally {
      setLoading(false);
    }
  }

  const proposal = doc?.proposal || null;
  const recommended = proposal?.recommendedVenue || null;
  const cost = proposal?.costEstimate || null;

  if (!isSignedIn) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
        <div className="text-white font-semibold text-lg">Proposal details</div>
        <p className="text-zinc-300 text-sm mt-2">Sign in to view your saved proposals.</p>
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
          <div className="text-zinc-300 text-sm">Proposal</div>
          <h1 className="text-2xl md:text-3xl font-semibold text-white">Venue Proposal</h1>
        </div>
        <div className="flex gap-3">
          <Link href="/proposals" className="text-sm text-zinc-200 underline underline-offset-4">
            Back to list
          </Link>
        </div>
      </div>

      {loading ? <div className="text-zinc-300 text-sm">Loading...</div> : null}
      {error ? <div className="p-3 rounded-lg bg-red-500/10 text-red-300 text-sm border border-red-500/20">{error}</div> : null}

      {doc ? (
        <section className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6">
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
                <button
                  onClick={exportPdf}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-[var(--accent)] text-black font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity"
                >
                  Export PDF
                </button>
              </div>
            </div>
          </div>

          {Array.isArray(proposal?.alternativeVenues) && proposal.alternativeVenues.length ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">Alternative options</h3>
              <div className="grid gap-3 md:grid-cols-2">
                {proposal.alternativeVenues.map((v) => (
                  <div
                    key={v.placeId}
                    className="border border-white/10 rounded-xl p-4 bg-black/20"
                  >
                    <div className="font-medium text-white">{v.name}</div>
                    {v.reason ? <div className="text-sm text-zinc-300 mt-1">{v.reason}</div> : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">Schedule outline</h3>
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-medium text-white">Day 1</div>
                  {Array.isArray(proposal?.agendaSkeleton?.day1) ? (
                    <ul className="list-disc pl-5 text-sm text-zinc-300 mt-2">
                      {proposal.agendaSkeleton.day1.map((s: string, i: number) => (
                        <li key={`${s}-${i}`}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Day 2</div>
                  {Array.isArray(proposal?.agendaSkeleton?.day2) ? (
                    <ul className="list-disc pl-5 text-sm text-zinc-300 mt-2">
                      {proposal.agendaSkeleton.day2.map((s: string, i: number) => (
                        <li key={`${s}-${i}`}>{s}</li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">Cost estimate</h3>
              {cost ? (
                <div className="text-sm text-zinc-300 space-y-1">
                  <div>Venue: <b className="text-white">{formatMoney(cost.venue, cost.currency) || '-'}</b></div>
                  <div>Catering: <b className="text-white">{formatMoney(cost.catering, cost.currency) || '-'}</b></div>
                  <div>Transport: <b className="text-white">{formatMoney(cost.transport, cost.currency) || '-'}</b></div>
                  <div>Misc: <b className="text-white">{formatMoney(cost.misc, cost.currency) || '-'}</b></div>
                  <div className="pt-2 border-t border-white/10">
                    Total: <b className="text-white">{formatMoney(cost.total, cost.currency) || '-'}</b>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {proposal?.cateringNotes ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">Catering notes</h3>
              <p className="text-sm text-zinc-300">{proposal.cateringNotes}</p>
            </div>
          ) : null}

          {Array.isArray(proposal?.logisticsTips) && proposal.logisticsTips.length ? (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-zinc-200 mb-2">Logistics tips</h3>
              <ul className="list-disc pl-5 text-sm text-zinc-300">
                {proposal.logisticsTips.map((t: string, i: number) => (
                  <li key={`${t}-${i}`}>{t}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

