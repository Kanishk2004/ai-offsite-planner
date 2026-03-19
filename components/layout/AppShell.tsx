'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import {
	ClerkLoaded,
	ClerkLoading,
	Show,
	SignInButton,
	UserButton,
} from '@clerk/nextjs';

function NavLink({
	href,
	label,
	pathname,
}: {
	href: string;
	label: string;
	pathname: string;
}) {
	const isActive =
		pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
	return (
		<Link
			href={href}
			className={[
				'inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-all',
				isActive
					? 'bg-[var(--accent)]/15 text-[var(--accent)] ring-1 ring-[var(--accent)]/30'
					: 'text-zinc-300 hover:bg-white/8 hover:text-white',
			].join(' ')}>
			<span
				className={[
					'mr-2 h-1.5 w-1.5 rounded-full transition-colors',
					isActive ? 'bg-[var(--accent)]' : 'bg-zinc-500',
				].join(' ')}
			/>
			{label}
		</Link>
	);
}

export default function AppShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();

	return (
		<div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
			<header className="sticky top-0 z-20 border-b border-white/10 bg-[linear-gradient(180deg,rgba(0,0,0,0.92),rgba(0,0,0,0.76))] backdrop-blur-xl">
				<div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Link
							href="/dashboard"
							className="inline-flex items-center gap-2.5 font-semibold tracking-tight text-white group">
							<span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-[var(--accent)]/15 ring-1 ring-[var(--accent)]/30 text-[var(--accent)] text-xs font-bold group-hover:bg-[var(--accent)]/20 transition-colors">
								AI
							</span>
							<span className="hidden sm:inline">Offsite Planner</span>
							<span className="sm:hidden">Planner</span>
						</Link>
					</div>

					<nav className="flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-1">
						<ClerkLoading>
							<div className="h-8 w-44 rounded-full bg-white/10" aria-hidden="true" />
						</ClerkLoading>
						<ClerkLoaded>
							<Show when="signed-in">
								<NavLink
									href="/dashboard"
									label="Dashboard"
									pathname={pathname}
								/>
								<NavLink
									href="/proposals"
									label="Proposals"
									pathname={pathname}
								/>
							</Show>
							<Show when="signed-out">
								<SignInButton fallbackRedirectUrl="/dashboard">
									<button
										type="button"
										className="inline-flex items-center rounded-full bg-[var(--accent)] px-3 py-1.5 text-sm font-semibold text-black hover:opacity-95 transition-opacity">
										Sign in
									</button>
								</SignInButton>
							</Show>
						</ClerkLoaded>
					</nav>

					<ClerkLoading>
						<div className="h-8 w-8 rounded-full bg-white/10" aria-hidden="true" />
					</ClerkLoading>
					<ClerkLoaded>
						<Show when="signed-in">
							<div className="rounded-full ring-1 ring-white/15">
								<UserButton />
							</div>
						</Show>
					</ClerkLoaded>
				</div>
			</header>

			<main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
		</div>
	);
}
