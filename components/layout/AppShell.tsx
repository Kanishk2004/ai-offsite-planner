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
	const isActive = pathname === href;
	return (
		<Link
			href={href}
			className={[
				'text-sm font-medium transition-colors',
				isActive
					? 'text-[var(--accent)]'
					: 'text-zinc-300 hover:text-[var(--accent)]',
			].join(' ')}>
			{label}
		</Link>
	);
}

export default function AppShell({ children }: { children: ReactNode }) {
	const pathname = usePathname();

	return (
		<div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
			<header className="sticky top-0 z-10 border-b border-white/5 bg-black/80 backdrop-blur">
				<div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
					<div className="flex items-center gap-3">
						<Link
							href="/dashboard"
							className="font-semibold tracking-tight text-white">
							<span className="text-[var(--accent)]">AI</span> Event Concierge
						</Link>
					</div>

					<nav className="flex items-center gap-5">
						<ClerkLoading>
							<div className="h-5 w-44 rounded bg-white/10" aria-hidden="true" />
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
								<SignInButton fallbackRedirectUrl="/dashboard" />
							</Show>
						</ClerkLoaded>
					</nav>

					<ClerkLoading>
						<div className="h-8 w-8 rounded-full bg-white/10" aria-hidden="true" />
					</ClerkLoading>
					<ClerkLoaded>
						<Show when="signed-in">
							<UserButton />
						</Show>
					</ClerkLoaded>
				</div>
			</header>

			<main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
		</div>
	);
}
