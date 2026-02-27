import express, { Request, Response } from 'express';
import { config, validateConfig } from './config';
import { createOrUpdateContact, testHubSpotConnection, isHubSpotEnabled } from './hubspot';
import { syncLeadsToSheets } from './sync-leads';
import type { LeadInfo, VapiMessage } from './types';

const app = express();
app.use(express.json());

// Store active conversations (in production, use Redis or a database)
const activeConversations = new Map<string, Partial<LeadInfo> & { phoneNumber: string }>();

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Manual sync trigger
app.get('/sync', async (_req: Request, res: Response) => {
  try {
    await syncLeadsToSheets();
    res.json({ status: 'ok', message: 'Sync completed' });
  } catch (error) {
    console.error('Manual sync failed:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Main Vapi webhook endpoint
app.post('/vapi/webhook', async (req: Request, res: Response) => {
  const message: VapiMessage = req.body;

  console.log('Received Vapi webhook:', JSON.stringify(message, null, 2));

  try {
    switch (message.type) {
      case 'function-call':
        if (message.functionCall?.name === 'saveLead') {
          const result = await handleSaveLead(message);
          res.json(result);
          return;
        }
        break;

      case 'status-update':
        console.log('Call status update:', message);
        break;

      case 'end-of-call-report':
        console.log('Call ended:', message.call?.id);
        if (message.call?.id) {
          activeConversations.delete(message.call.id);
        }
        break;

      case 'transcript':
        console.log('Transcript update:', message.message?.content);
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function handleSaveLead(message: VapiMessage): Promise<{ result: string }> {
  const params = message.functionCall?.parameters as Partial<LeadInfo> | undefined;

  if (!params) {
    return { result: 'Error: No parameters provided' };
  }

  const lead: LeadInfo = {
    firstName: String(params.firstName || ''),
    lastName: String(params.lastName || ''),
    email: String(params.email || ''),
    phone: message.call?.customer?.number || '',
    company: String(params.company || ''),
    jobTitle: String(params.jobTitle || ''),
    eventQuestions: String(params.eventQuestions || ''),
  };

  console.log('Saving lead:', lead);

  try {
    const contactId = await createOrUpdateContact(lead, lead.phone);
    if (contactId) {
      console.log(`Lead saved successfully. HubSpot contact ID: ${contactId}`);
    } else {
      console.log('Lead captured (HubSpot disabled)');
    }
    return {
      result: `Successfully saved your information. Our team will follow up with you soon at ${lead.email}. Is there anything else I can help you with?`,
    };
  } catch (error) {
    console.error('Error saving lead:', error);
    return {
      result:
        "I've noted your information and our team will follow up with you soon. Is there anything else I can help you with?",
    };
  }
}

// Start server
async function start(): Promise<void> {
  try {
    validateConfig();

    // Test HubSpot connection if enabled
    if (isHubSpotEnabled()) {
      const hubspotConnected = await testHubSpotConnection();
      if (!hubspotConnected) {
        console.warn('Warning: Could not connect to HubSpot. Check your API key.');
      }
    } else {
      console.log('HubSpot integration disabled - leads will be logged only');
    }

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Webhook URL: ${config.webhookBaseUrl}/vapi/webhook`);
      console.log(`Health check: ${config.webhookBaseUrl}/health`);

      // Start periodic lead sync to Google Sheets
      if (config.syncIntervalMs > 0 && config.vapiBackfillSessionId) {
        console.log(`[SYNC] Enabled — syncing every ${config.syncIntervalMs / 1000}s`);
        setTimeout(() => syncLeadsToSheets(), 30_000); // First run after 30s
        setInterval(() => syncLeadsToSheets(), config.syncIntervalMs);
      } else {
        console.log('[SYNC] Disabled — set SYNC_INTERVAL_MS and VAPI_BACKFILL_SESSION_ID to enable');
      }
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();
