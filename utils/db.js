import mongoose from 'mongoose';
import dns from 'node:dns';

// ─── MongoDB connection ───────────────────────────────────────────────────────

function shouldApplyDnsFallback() {
	const flag = (process.env.MONGODB_DNS_FALLBACK || '').toLowerCase();
	if (flag === '0' || flag === 'false' || flag === 'off') return false;
	return true;
}

function applyDnsFallbackIfNeeded() {
	if (!shouldApplyDnsFallback()) return false;

	const servers = dns.getServers();
	const hasNonLocalResolver = servers.some(
		(server) => server !== '127.0.0.1' && server !== '::1',
	);

	if (!hasNonLocalResolver) {
		dns.setServers(['1.1.1.1', '8.8.8.8']);
		console.warn(
			'[mongodb] Local DNS resolver detected; applying DNS fallback.',
		);
		return true;
	}

	return false;
}

function isSrvDnsError(error) {
	const message = String(error?.message || '');
	return message.includes('querySrv') && message.includes('ECONNREFUSED');
}

export async function connectDB() {
	if (mongoose.connection.readyState >= 1) return;

	const mongoUri = process.env.MONGODB_URI;
	if (!mongoUri) {
		throw new Error('MONGODB_URI is not configured.');
	}

	applyDnsFallbackIfNeeded();

	try {
		await mongoose.connect(mongoUri, {
			serverSelectionTimeoutMS: 15000,
		});
	} catch (error) {
		if (!isSrvDnsError(error)) {
			throw error;
		}

		dns.setServers(['1.1.1.1', '8.8.8.8']);
		console.warn('[mongodb] Retrying connection after SRV DNS failure.');

		await mongoose.connect(mongoUri, {
			serverSelectionTimeoutMS: 15000,
		});
	}
}

// ─── Mongoose models ──────────────────────────────────────────────────────────

const venueCacheSchema = new mongoose.Schema({
	queryKey: { type: String, required: true, unique: true },
	places: { type: Array, default: [] },
	cachedAt: { type: Date, default: Date.now },
});

export const VenueCache =
	mongoose.models.VenueCache || mongoose.model('VenueCache', venueCacheSchema);

// ─────────────────────────────────────────────────────────────────────────────

const proposalSchema = new mongoose.Schema({
	userId: { type: String, required: true, index: true },
	prompt: { type: String, required: true },
	plannerName: { type: String, default: 'Anonymous' },
	status: { type: String, default: 'draft' },
	intent: { type: Object },
	venues: {
		type: [
			{
				placeId: { type: String, required: true },
				name: { type: String, default: '' },
				address: { type: String, default: '' },
				rating: { type: Number },
				priceLevel: { type: Number },
				websiteUri: { type: String, default: '' },
			},
		],
		default: [],
	},
	venueIds: { type: [String], default: [] },
	// Legacy field kept for backward compatibility with older documents.
	proposalText: { type: Object },
	proposal: { type: Object },
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now },
});

proposalSchema.index({ userId: 1, createdAt: -1 });

export const Proposal =
	mongoose.models.Proposal || mongoose.model('Proposal', proposalSchema);
