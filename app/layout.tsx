import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import AppShell from '@/components/layout/AppShell';

const geistSans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
});

const geistMono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
});

export const metadata: Metadata = {
	title: 'AI Offsite Planner',
	description:
		'An AI-powered event concierge platform to help you plan unforgettable offsite events with ease.',
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<ClerkProvider>
			<html
				lang="en"
				suppressHydrationWarning
				className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
				<body className="min-h-full flex flex-col">
					<AppShell>{children}</AppShell>
				</body>
			</html>
		</ClerkProvider>
	);
}
