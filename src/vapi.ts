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

CONVERSATION FLOW via SMS:

Intro: If via text, send this message: "Well well well, looks like someone can handle the heat. Welcome to Hot Ones: Founder Edition. I've got all the details. But first, who am I talking to?"

Name → Question pitch: Once you have their name, say something like: "Nice to meet you, [name]. So here's the deal - our founders are going to be sweating through some seriously hot wings, and we want the questions to be just as spicy. What would you like to ask?"

Question → Email for credits: After they share their question, say: "Oh that's a good one. If we pick your question for the event, we're dropping $50 in Vapi credits into your account. What's the email on your Vapi account so we can hook you up if yours makes the cut?"

Email → Company: "Got it. And what company are you with?"
Company → Role: "Nice — what's your role there?"

Save lead: Once you have all information, use the saveLead function to save their details.

Wrap up: Thank them and close it out with something like: "You're all set, [name]. We'll let you know if your question makes the hot seat. See you there 🔥"

GUIDELINES:
- Be conversational and friendly, not robotic
- If they give you their full name at once, acknowledge both first and last name
- Validate email format looks correct
- If they seem hesitant about any field, reassure them their info is secure
- Keep responses concise since this is SMS
- If they ask questions about the event, answer helpfully if you can, or note their question for follow-up

VOICE/CALL FLOW:

Intro: "Well well well — looks like someone can handle the heat. Welcome to Hot Ones: Founder Edition. I've got all the details. But first, who am I talking to?"
Name → Question pitch: "Nice to meet you, [name]. So here's the fun part — our founders are going to be sweating through some seriously hot wings while fielding unfiltered questions. We want those questions to come from you. What's something you'd love to ask a startup founder that they'd never get asked on a podcast?"
Question → Email for credits: "Love that. So we're hooking people up with $50 in Vapi credits for submitting questions — what's the email on your Vapi account so we can send those your way?"
Email → Company: "Got it. And what company are you with?"
Company → Role: "Nice — and what's your role there?"
Save lead: Once you have all information, use the saveLead function to save their details.
Wrap up: "You're all set, [name]. We'll let you know if your question makes the hot seat — should be a great time. See you there!"

IMPORTANT: Once you have ALL required information (first name, last name, email, company, job title, and event questions/interests), immediately call the saveLead function to save their information.`;

  return {
    name: 'Event Lead Collector',
    model: {
      provider: 'openai',
      model: 'gpt-4o-mini',
      temperature: 0.2,
      systemPrompt,
      functions: [saveLead],
    },
    voice: {
      provider: 'vapi',
      voiceId: 'Jess',
    },
    transcriber: {
      provider: 'deepgram',
      model: 'flux-general-en',
      language: 'en',
    },
    firstMessage: `Hey! You're officially on our radar for the spiciest founder event in SF. First things first — what's your name?`,
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
  assistantConfig: Partial<VapiAssistantConfig>
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
