import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProposalsList from '@/components/proposals/ProposalsList';

export default async function ProposalsPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  return <ProposalsList />;
}

