import { config } from './config';

const VAPI_API_URL = 'https://api.vapi.ai';

// Only sync sessions created after auto-sync was deployed (skip all pre-existing sessions)
const SYNC_CUTOFF = '2026-02-27T00:30:00Z';

// Track session IDs already pushed via backfill (persists across sync runs, resets on restart)
const syncedSessionIds = new Set<string>();

interface VapiSession {
  id: string;
  status: string;
  createdAt: string;
  messages: Array<{
    role: string;
    content?: string;
    tool_calls?: Array<{
      function: { name: string; arguments: string };
    }>;
  }>;
  customer?: { number: string };
  metadata?: { transport?: { provider: string } };
}

interface ExtractedLead {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  jobTitle: string;
  eventQuestion: string;
  timestamp: string;
}

/**
 * Fetch all sessions from Vapi API.
 */
async function fetchSessions(): Promise<VapiSession[]> {
  const response = await fetch(`${VAPI_API_URL}/session?limit=100`, {
    headers: { Authorization: `Bearer ${config.vapiApiKey}` },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch sessions: ${response.status} ${await response.text()}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data as { results?: VapiSession[] }).results || [];
}

/**
 * Check if a session already has a successful Google Sheets append.
 */
function isAlreadySynced(session: VapiSession): boolean {
  for (const msg of session.messages) {
    if (msg.role === 'tool' && msg.content && msg.content.includes('updatedRows')) {
      return true;
    }
  }
  return false;
}

/**
 * Extract lead data from session messages by parsing the conversation flow.
 */
function extractLead(session: VapiSession): ExtractedLead | null {
  const messages = session.messages;
  const userMessages = messages.filter((m) => m.role === 'user').map((m) => m.content || '');

  // Check for tool calls that contain structured lead data (saveLead or append_lead_row)
  for (const msg of messages) {
    if (msg.tool_calls) {
      for (const tc of msg.tool_calls) {
        const fnName = tc.function.name;
        if (fnName === 'saveLead' || fnName.startsWith('append_lead_row')) {
          try {
            const args = JSON.parse(tc.function.arguments);
            if (args.firstName && args.email) {
              return {
                firstName: args.firstName || '',
                lastName: args.lastName || '',
                email: args.email || '',
                company: args.company || '',
                jobTitle: args.jobTitle || '',
                eventQuestion: args.eventQuestion || args.eventQuestions || '',
                timestamp: session.createdAt,
              };
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }

  // Fallback: try to extract from assistant recap messages
  for (const msg of messages) {
    if (msg.role === 'assistant' && msg.content) {
      const content = msg.content;
      const emailMatch = content.match(/Email:\s*(\S+@\S+)/i);
      const nameMatch = content.match(/Name:\s*(.+?)(?:\n|$)/i);
      const companyMatch = content.match(/Company:\s*(.+?)(?:\n|$)/i);
      const roleMatch = content.match(/Role:\s*(.+?)(?:\n|$)/i);
      const questionMatch = content.match(/Question:\s*(.+?)(?:\n|$)/i);

      if (emailMatch && nameMatch) {
        const nameParts = nameMatch[1].trim().split(/\s+/);
        return {
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: emailMatch[1].trim().replace(/,$/, ''),
          company: companyMatch ? companyMatch[1].trim() : '',
          jobTitle: roleMatch ? roleMatch[1].trim() : '',
          eventQuestion: questionMatch ? questionMatch[1].trim() : '',
          timestamp: session.createdAt,
        };
      }
    }
  }

  // Not enough data to extract a lead
  if (userMessages.length < 4) return null;
  return null;
}

/**
 * Push a lead to Google Sheets by sending a chat message that triggers the Sheets tool.
 */
async function pushLeadToSheets(sessionId: string, lead: ExtractedLead): Promise<boolean> {
  const backfillSessionId = config.vapiBackfillSessionId;
  if (!backfillSessionId) {
    console.error('[SYNC] No VAPI_BACKFILL_SESSION_ID configured, cannot push leads');
    return false;
  }

  const input = `Use append_lead_row_v2 to save: firstName: ${lead.firstName}, lastName: ${lead.lastName}, email: ${lead.email}, company: ${lead.company}, jobTitle: ${lead.jobTitle}, eventQuestion: ${lead.eventQuestion}, timestamp: ${lead.timestamp}`;

  const response = await fetch(`${VAPI_API_URL}/chat`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.vapiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ sessionId: backfillSessionId, input }),
  });

  if (!response.ok) {
    console.error(`[SYNC] Failed to push lead ${lead.firstName}: ${response.status}`);
    return false;
  }

  const data = (await response.json()) as {
    output: Array<{ role: string; content?: string }>;
  };
  const success = data.output?.some(
    (o) => o.content && (o.content.includes('updatedRows') || o.content.toLowerCase().includes('successfully'))
  );

  return success;
}

/**
 * Main sync function — call on interval.
 * Fetches sessions, finds unsynced complete leads, pushes to Sheets.
 */
export async function syncLeadsToSheets(): Promise<void> {
  console.log(`[SYNC] Starting lead sync at ${new Date().toISOString()}`);

  try {
    const sessions = await fetchSessions();
    let synced = 0;
    let skipped = 0;
    let incomplete = 0;

    for (const session of sessions) {
      // Skip old sessions created before auto-sync went live
      if (session.createdAt < SYNC_CUTOFF) {
        skipped++;
        continue;
      }

      // Skip sessions already pushed via backfill or that have a native Sheets append
      if (syncedSessionIds.has(session.id) || isAlreadySynced(session)) {
        skipped++;
        continue;
      }

      // Try to extract lead data
      const lead = extractLead(session);
      if (!lead || !lead.firstName || !lead.email) {
        incomplete++;
        continue;
      }

      // Push to Sheets
      const success = await pushLeadToSheets(session.id, lead);
      if (success) {
        syncedSessionIds.add(session.id);
        console.log(`[SYNC] Pushed lead: ${lead.firstName} ${lead.lastName} (${lead.email})`);
        synced++;
      } else {
        console.error(`[SYNC] Failed to push lead: ${lead.firstName} ${lead.lastName}`);
      }
    }

    console.log(
      `[SYNC] Complete: ${synced} pushed, ${skipped} already synced, ${incomplete} incomplete`
    );
  } catch (error) {
    console.error('[SYNC] Error during lead sync:', error);
  }
}
