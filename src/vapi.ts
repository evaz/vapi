import { config } from './config';
import type { VapiAssistantConfig, VapiFunction } from './types';

const VAPI_API_URL = 'https://api.vapi.ai';

const saveLead: VapiFunction = {
  name: 'saveLead',
  description:
    'Save the collected lead information to the database. Call this when you have collected all the required information: first name, last name, email, company, job title, and their event questions or topics of interest.',
  parameters: {
    type: 'object',
    properties: {
      firstName: {
        type: 'string',
        description: "The lead's first name",
      },
      lastName: {
        type: 'string',
        description: "The lead's last name",
      },
      email: {
        type: 'string',
        description: "The lead's email address",
      },
      company: {
        type: 'string',
        description: "The lead's company name",
      },
      jobTitle: {
        type: 'string',
        description: "The lead's job title or role",
      },
      eventQuestions: {
        type: 'string',
        description: "The lead's questions about the event or topics they're interested in",
      },
    },
    required: ['firstName', 'lastName', 'email', 'company', 'jobTitle', 'eventQuestions'],
  },
};

export function getAssistantConfig(webhookUrl: string): VapiAssistantConfig {
  const systemPrompt = `You are a friendly event assistant helping collect information from attendees interested in ${config.eventName}. Your goal is to have a natural conversation while gathering their contact details and learning about their interests.

CONVERSATION FLOW:
1. Start with a warm greeting and ask for their name
2. Once you have their name, ask for their email address
3. Then ask about their company
4. Ask about their role/job title
5. Finally, ask what questions they have about the event or what topics interest them most
6. Once you have all information, use the saveLead function to save their details
7. Thank them and let them know someone will follow up

GUIDELINES:
- Be conversational and friendly, not robotic
- If they give you their full name at once, acknowledge both first and last name
- Validate email format looks correct
- If they seem hesitant about any field, reassure them their info is secure
- Keep responses concise since this is SMS
- If they ask questions about the event, answer helpfully if you can, or note their question for follow-up

IMPORTANT: Once you have ALL required information (first name, last name, email, company, job title, and event questions/interests), immediately call the saveLead function to save their information.`;

  return {
    name: 'Event Lead Collector',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      systemPrompt,
      functions: [saveLead],
    },
    voice: {
      provider: 'openai',
      voiceId: 'alloy',
    },
    firstMessage: `Hi there! Thanks for your interest in ${config.eventName}. I'd love to help answer any questions and make sure you get the info you need. To start, could you tell me your name?`,
    serverUrl: webhookUrl,
  };
}

export async function createAssistant(assistantConfig: VapiAssistantConfig): Promise<string> {
  const response = await fetch(`${VAPI_API_URL}/assistant`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.vapiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assistantConfig),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create assistant: ${error}`);
  }

  const data = (await response.json()) as { id: string };
  console.log('Created Vapi assistant:', data.id);
  return data.id;
}

export async function updateAssistant(
  assistantId: string,
  assistantConfig: VapiAssistantConfig
): Promise<void> {
  const response = await fetch(`${VAPI_API_URL}/assistant/${assistantId}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${config.vapiApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(assistantConfig),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to update assistant: ${error}`);
  }

  console.log('Updated Vapi assistant:', assistantId);
}

export async function listAssistants(): Promise<Array<{ id: string; name: string }>> {
  const response = await fetch(`${VAPI_API_URL}/assistant`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${config.vapiApiKey}`,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list assistants: ${error}`);
  }

  return (await response.json()) as Array<{ id: string; name: string }>;
}
