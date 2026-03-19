import { auth } from "@clerk/nextjs/server";
import { connectDB, Proposal } from '@/utils/db';

export async function GET() {
  const { userId } = await auth();

  // Middleware already blocks unauthenticated requests, but this
  // acts as a defence-in-depth check directly inside the handler.
  if (!userId) {
    return Response.json(
      { error: "Unauthorized", message: "Authentication required." },
      { status: 401 },
    );
  }

  // Connect to MongoDB
  try {
    await connectDB();
  } catch (err) {
    console.error("[mongodb] Connection error:", err);
    return Response.json(
      { error: "Database connection failed." },
      { status: 500 },
    );
  }

  const proposals = await Proposal.find({ userId })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return Response.json({
    proposals: proposals.map((p) => {
      const proposalObj = p.proposal || p.proposalText || {};
      const recommendedVenue = proposalObj.recommendedVenue;

      return {
        proposalId: p._id?.toString?.() || String(p._id),
        createdAt: p.createdAt,
        status: p.status,
        promptPreview: typeof p.prompt === "string" ? p.prompt.slice(0, 140) : "",
        recommendedVenue:
          recommendedVenue && typeof recommendedVenue === "object"
            ? {
                placeId: recommendedVenue.placeId,
                name: recommendedVenue.name,
                rationale: recommendedVenue.rationale,
              }
            : null,
        costEstimate: proposalObj.costEstimate || null,
      };
    }),
  });
}

export async function POST() {
  return Response.json({ error: "Method Not Allowed" }, { status: 405 });
}
