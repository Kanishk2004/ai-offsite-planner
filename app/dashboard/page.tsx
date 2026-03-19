import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProposalCreator from '@/components/proposals/ProposalCreator';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-[var(--accent)]/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
      </div>
      <ProposalCreator />
    </div>
  );
}

