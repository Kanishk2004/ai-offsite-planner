'use client';

import { SignInButton } from '@clerk/nextjs';

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-5 rounded-xl border border-white/10 bg-white/5">
      <div className="text-[var(--accent)] font-semibold mb-2">{title}</div>
      <div className="text-zinc-300 text-sm leading-relaxed">{description}</div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="flex flex-col gap-12">
      <section className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent">
        <div className="absolute -top-24 -right-28 w-96 h-96 bg-[var(--accent)]/15 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-28 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl" />

        <div className="relative p-8 md:p-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-zinc-200">
            <span className="inline-block w-2 h-2 rounded-full bg-[var(--accent)]" />
            Built for corporate HR & event planners
          </div>

          <h1 className="mt-6 text-3xl md:text-5xl font-semibold tracking-tight text-white">
            Plan a corporate offsite with AI—then export a proposal.
          </h1>
          <p className="mt-4 text-zinc-300 text-base md:text-lg max-w-2xl">
            Describe your event in natural language. We infer requirements, search real venues via a live venues API,
            and return a structured proposal you can save and share.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <SignInButton
              mode="modal"
              fallbackRedirectUrl="/dashboard"
            >
              <button
                type="button"
                className="rounded-xl bg-[var(--accent)] text-black font-semibold px-6 py-3 hover:opacity-95 transition-opacity"
              >
                Get started
              </button>
            </SignInButton>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-zinc-200 text-sm">Venue discovery</div>
              <div className="text-white font-semibold mt-1">Google Places API</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-zinc-200 text-sm">AI planning</div>
              <div className="text-white font-semibold mt-1">Structured proposal output</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4">
              <div className="text-zinc-200 text-sm">Export</div>
              <div className="text-white font-semibold mt-1">PDF for stakeholders</div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-white">How it works</h2>
            <p className="mt-2 text-zinc-300 text-sm md:text-base">
              A simple flow designed for vague prompts and real venue data.
            </p>
          </div>
          <div className="hidden md:block text-sm text-zinc-400">
            Tip: add a city/region hint if you know it.
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Feature
            title="1) Describe"
            description="Share headcount, timing, budget, and the vibe. If location is vague, we infer constraints."
          />
          <Feature
            title="2) Discover"
            description="We generate targeted venue searches, call a real venues API, and dedupe results with caching."
          />
          <Feature
            title="3) Propose"
            description="We return a structured proposal with recommended venue, alternatives, schedule outline, and cost."
          />
        </div>
      </section>

      <section className="border border-white/10 bg-white/5 rounded-2xl p-8 md:p-10">
        <h2 className="text-xl md:text-2xl font-semibold text-white">Ready to plan?</h2>
        <p className="mt-2 text-zinc-300 text-sm md:text-base max-w-2xl">
          Sign in to generate and save your first offsite venue proposal.
        </p>
        <div className="mt-6">
          <SignInButton
            mode="modal"
            fallbackRedirectUrl="/dashboard"
          >
            <button
              type="button"
              className="rounded-xl bg-[var(--accent)] text-black font-semibold px-6 py-3 hover:opacity-95 transition-opacity"
            >
              Create your proposal
            </button>
          </SignInButton>
        </div>
      </section>

      <footer className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/10 via-white/5 to-transparent p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs uppercase tracking-[0.18em] text-zinc-400">Developer</div>
            <h3 className="mt-1 text-xl font-semibold text-white">Kanishk Chandna</h3>
            <a
              href="mailto:kanishkchandna29@gmail.com"
              className="mt-2 inline-flex text-sm text-zinc-300 underline underline-offset-4 hover:text-white"
            >
              kanishkchandna29@gmail.com
            </a>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:min-w-[460px]">
            {[
              { label: 'LinkedIn', href: 'https://linkedin.com/in/kanishk-chandna' },
              { label: 'GitHub', href: 'https://github.com/kanishk2004' },
              { label: 'Twitter', href: 'https://x.com/kanishk_fr' },
              { label: 'Instagram', href: 'https://instagram.com/kanishk__fr' },
              { label: 'Blogs', href: 'https://blogs.kanishk.codes' },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-white/10 bg-black/25 px-3 py-2 text-sm text-zinc-200 hover:bg-white/10 hover:text-white transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

