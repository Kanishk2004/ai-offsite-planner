import { auth } from '@clerk/nextjs/server';
import { connectDB, Proposal } from '@/utils/db';

export async function GET(_request, { params }) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { proposalId } = await params;
  if (!proposalId) {
    return Response.json({ error: 'proposalId is required.' }, { status: 400 });
  }

  try {
    await connectDB();
  } catch (err) {
    console.error('[mongodb] Connection error:', err);
    return Response.json(
      { error: 'Database connection failed.' },
      { status: 500 },
    );
  }

  const proposalDoc = await Proposal.findOne({ _id: proposalId, userId }).lean();
  if (!proposalDoc) {
    return Response.json({ error: 'Proposal not found.' }, { status: 404 });
  }

  const proposal = proposalDoc.proposal || proposalDoc.proposalText || {};

  return Response.json({
    proposalId: proposalDoc._id.toString(),
    prompt: proposalDoc.prompt,
    plannerName: proposalDoc.plannerName,
    status: proposalDoc.status,
    createdAt: proposalDoc.createdAt,
    updatedAt: proposalDoc.updatedAt,
    intent: proposalDoc.intent,
    proposal,
    venues: proposalDoc.venues || [],
    venueIds: proposalDoc.venueIds || [],
  });
}

