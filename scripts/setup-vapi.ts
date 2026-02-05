import { config, validateConfig } from '../src/config';
import { createAssistant, updateAssistant, listAssistants, getAssistantConfig } from '../src/vapi';

const ASSISTANT_NAME = 'Event Lead Collector';

async function setup(): Promise<void> {
  try {
    validateConfig();

    if (!config.webhookBaseUrl) {
      console.error('Error: WEBHOOK_BASE_URL is required to set up the assistant.');
      console.log('Please set your Render.com URL or ngrok URL in .env');
      process.exit(1);
    }

    const webhookUrl = `${config.webhookBaseUrl}/vapi/webhook`;

    console.log('Checking for existing assistants...');
    const existingAssistants = await listAssistants();
    const existingAssistant = existingAssistants.find((a) => a.name === ASSISTANT_NAME);

    if (existingAssistant) {
      // Only update the webhook URL - preserve all other dashboard settings
      console.log(`Found existing assistant: ${existingAssistant.id}`);
      console.log('Updating webhook URL only (preserving dashboard settings)...');
      await updateAssistant(existingAssistant.id, { serverUrl: webhookUrl });
      console.log('Webhook URL updated successfully!');
      console.log(`Assistant ID: ${existingAssistant.id}`);
      console.log(`Webhook URL: ${webhookUrl}`);
    } else {
      // Create new assistant with full config
      console.log('Creating new assistant...');
      const assistantConfig = getAssistantConfig(webhookUrl);
      const assistantId = await createAssistant(assistantConfig);
      console.log('Assistant created successfully!');
      console.log(`Assistant ID: ${assistantId}`);
    }

    console.log('\n--- Next Steps ---');
    console.log('1. Go to https://dashboard.vapi.ai');
    console.log('2. Navigate to Phone Numbers');
    console.log('3. Buy or import a phone number');
    console.log('4. Assign the "Event Lead Collector" assistant to that number');
    console.log('5. Enable SMS for the phone number');
    console.log('6. Test by sending an SMS to your Vapi number!');
  } catch (error) {
    console.error('Setup failed:', error);
    process.exit(1);
  }
}

setup();
