import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProposalCreator from '@/components/proposals/ProposalCreator';

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <ProposalCreator />;
}

