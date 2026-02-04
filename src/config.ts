import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  vapiApiKey: process.env.VAPI_API_KEY || '',
  hubspotApiKey: process.env.HUBSPOT_API_KEY || '',
  webhookBaseUrl: process.env.WEBHOOK_BASE_URL || '',
  webhookSecret: process.env.WEBHOOK_SECRET || '',
  eventName: process.env.EVENT_NAME || 'our upcoming event',
};

export function validateConfig(): void {
  const required = ['vapiApiKey', 'hubspotApiKey'] as const;
  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
