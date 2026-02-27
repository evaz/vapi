import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  vapiApiKey: process.env.VAPI_API_KEY || '',
  hubspotApiKey: process.env.HUBSPOT_API_KEY || '',
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || '',
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  eventName: process.env.EVENT_NAME || 'our upcoming event',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '300000', 10),
  vapiBackfillSessionId: process.env.VAPI_BACKFILL_SESSION_ID || '',
};

export function validateConfig(): void {
  if (!config.vapiApiKey) {
    throw new Error('Missing required environment variable: VAPI_API_KEY');
  }

  if (!config.hubspotApiKey) {
    console.warn('Warning: HUBSPOT_API_KEY not set. HubSpot integration disabled.');
  }
}
