import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import ProposalDetail from '@/components/proposals/ProposalDetail';

export default async function ProposalDetailPage({
	params,
}: {
	params: Promise<{ proposalId: string }>;
}) {
	const { userId } = await auth();
	if (!userId) redirect('/sign-in');

	const { proposalId } = await params;
	return <ProposalDetail proposalId={proposalId} />;
}
