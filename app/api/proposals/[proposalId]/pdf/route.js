import { auth } from '@clerk/nextjs/server';
import PDFDocument from 'pdfkit';
import { PassThrough } from 'stream';
import { connectDB, Proposal } from '@/utils/db';

function formatValue(value) {
  if (value === null || value === undefined) return 'TBD';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'string') return value.trim() || 'TBD';
  return String(value);
}

function formatMoney(value, currency) {
  if (typeof value !== 'number') return null;
  const cur = currency || 'USD';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: cur,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${cur} ${value}`;
  }
}

export const runtime = 'nodejs';

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

  const intent = proposalDoc.intent || {};
  const proposal = proposalDoc.proposal || proposalDoc.proposalText || {};
  const cost = proposal.costEstimate || {};
  const currency = intent.currency || cost.currency || 'USD';

  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const stream = new PassThrough();
  const chunks = [];

  doc.pipe(stream);
  stream.on('data', (chunk) => chunks.push(chunk));

  // ---- Header ----
  doc
    .fontSize(18)
    .text('Corporate Offsite Venue Proposal', { align: 'center' })
    .moveDown(0.8);

  doc.fontSize(10).fillColor('#555555').text(`Proposal ID: ${proposalId}`);
  if (proposalDoc.createdAt) {
    doc.text(`Created: ${new Date(proposalDoc.createdAt).toLocaleString()}`);
  }
  doc.moveDown();

  // ---- Event summary ----
  doc.fontSize(12).fillColor('#111111').text('Event Summary').moveDown(0.3);
  doc.fontSize(10);
  doc.text(`Headcount: ${formatValue(intent.headcount)}`);
  doc.text(`Budget: ${formatMoney(intent.budget, currency) || formatValue(intent.budget)} ${currency}`);
  const dateStart = intent?.dateRange?.start;
  const dateEnd = intent?.dateRange?.end;
  doc.text(
    `Date Range: ${dateStart ? new Date(dateStart).toLocaleDateString() : 'TBD'} - ${
      dateEnd ? new Date(dateEnd).toLocaleDateString() : 'TBD'
    }`,
  );
  doc.text(`Location: ${formatValue(intent.location)}`);
  doc.text(`Atmosphere: ${formatValue(intent.atmosphere)}`);
  doc.moveDown();

  // ---- Recommended venue ----
  const recommended = proposal.recommendedVenue || {};
  doc.fontSize(12).fillColor('#111111').text('Recommended Venue').moveDown(0.3);
  doc.fontSize(10);
  doc.text(`Name: ${formatValue(recommended.name)}`);
  doc.moveDown(0.2);
  doc.text(`Rationale: ${formatValue(recommended.rationale)}`);
  doc.moveDown();

  // ---- Alternatives ----
  const alternatives = Array.isArray(proposal.alternativeVenues)
    ? proposal.alternativeVenues
    : [];
  if (alternatives.length) {
    doc.fontSize(12).fillColor('#111111').text('Alternative Venues').moveDown(0.3);
    doc.fontSize(10);
    alternatives.slice(0, 5).forEach((v, idx) => {
      doc.text(`${idx + 1}. ${formatValue(v.name)}`);
      if (v.reason) doc.text(`   Reason: ${formatValue(v.reason)}`);
      doc.moveDown(0.2);
    });
    doc.moveDown();
  }

  // ---- Schedule outline ----
  const day1 = Array.isArray(proposal?.agendaSkeleton?.day1)
    ? proposal.agendaSkeleton.day1
    : [];
  const day2 = Array.isArray(proposal?.agendaSkeleton?.day2)
    ? proposal.agendaSkeleton.day2
    : [];
  if (day1.length || day2.length) {
    doc.fontSize(12).fillColor('#111111').text('Schedule Outline').moveDown(0.3);
    doc.fontSize(10);

    if (day1.length) {
      doc.text('Day 1:');
      day1.forEach((s) => doc.text(`• ${formatValue(s)}`));
      doc.moveDown(0.3);
    }
    if (day2.length) {
      doc.text('Day 2:');
      day2.forEach((s) => doc.text(`• ${formatValue(s)}`));
    }

    doc.moveDown();
  }

  // ---- Catering & logistics ----
  if (proposal.cateringNotes) {
    doc.fontSize(12).fillColor('#111111').text('Catering Notes').moveDown(0.3);
    doc.fontSize(10).text(proposal.cateringNotes);
    doc.moveDown();
  }
  if (Array.isArray(proposal.logisticsTips) && proposal.logisticsTips.length) {
    doc.fontSize(12).fillColor('#111111').text('Logistics Tips').moveDown(0.3);
    doc.fontSize(10);
    proposal.logisticsTips.slice(0, 15).forEach((t) => doc.text(`• ${formatValue(t)}`));
    doc.moveDown();
  }

  // ---- Costs ----
  if (cost && typeof cost === 'object' && (cost.total != null || Object.keys(cost).length)) {
    doc.fontSize(12).fillColor('#111111').text('Cost Estimate').moveDown(0.3);
    doc.fontSize(10);
    doc.text(`Venue: ${formatMoney(cost.venue, currency) || formatValue(cost.venue)}`);
    doc.text(`Catering: ${formatMoney(cost.catering, currency) || formatValue(cost.catering)}`);
    doc.text(`Transport: ${formatMoney(cost.transport, currency) || formatValue(cost.transport)}`);
    doc.text(`Misc: ${formatMoney(cost.misc, currency) || formatValue(cost.misc)}`);
    doc.moveDown(0.2);
    doc.text(`Total: ${formatMoney(cost.total, currency) || formatValue(cost.total)}`);
  }

  const pdfBufferPromise = new Promise((resolve, reject) => {
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });

  doc.end();

  const pdfBuffer = await pdfBufferPromise;

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="proposal-${proposalId}.pdf"`,
    },
  });
}

