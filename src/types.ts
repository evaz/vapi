export interface LeadInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  eventQuestions: string;
}

export interface VapiMessage {
  type: string;
  call?: VapiCall;
  message?: VapiMessageContent;
  functionCall?: VapiFunctionCall;
}

export interface VapiCall {
  id: string;
  phoneNumber?: {
    number: string;
  };
  customer?: {
    number: string;
  };
}

export interface VapiMessageContent {
  role: string;
  content: string;
}

export interface VapiFunctionCall {
  name: string;
  parameters: Record<string, unknown>;
}

export interface VapiAssistantConfig {
  name: string;
  model: {
    provider: string;
    model: string;
    temperature: number;
    systemPrompt: string;
    functions: VapiFunction[];
  };
  voice: {
    provider: string;
    voiceId: string;
  };
  transcriber?: {
    provider: string;
    model: string;
    language: string;
  };
  analysisPlan?: {
    structuredDataPlan?: {
      enabled: boolean;
      schema: {
        type: string;
        properties: Record<string, { type: string; description: string }>;
        required: string[];
      };
    };
  };
  firstMessage: string;
  serverUrl: string;
  serverUrlSecret?: string;
}

export interface VapiFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

export interface HubSpotContactProperties {
  firstname: string;
  lastname: string;
  email: string;
  phone: string;
  company: string;
  jobtitle: string;
  hs_lead_status?: string;
  notes?: string;
}
