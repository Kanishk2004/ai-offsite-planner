import ProposalDetail from '@/components/proposals/ProposalDetail';

export default async function ProposalDetailPage({
	params,
}: {
	params: Promise<{ proposalId: string }>;
}) {
	const { proposalId } = await params;
	return <ProposalDetail proposalId={proposalId} />;
}
