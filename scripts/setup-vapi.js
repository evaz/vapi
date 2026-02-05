"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("../src/config");
const vapi_1 = require("../src/vapi");
async function setup() {
    try {
        (0, config_1.validateConfig)();
        if (!config_1.config.webhookBaseUrl) {
            console.error('Error: WEBHOOK_BASE_URL is required to set up the assistant.');
            console.log('Please set your Render.com URL or ngrok URL in .env');
            process.exit(1);
        }
        const webhookUrl = `${config_1.config.webhookBaseUrl}/vapi/webhook`;
        const assistantConfig = (0, vapi_1.getAssistantConfig)(webhookUrl);
        console.log('Checking for existing assistants...');
        const existingAssistants = await (0, vapi_1.listAssistants)();
        const existingAssistant = existingAssistants.find((a) => a.name === assistantConfig.name);
        if (existingAssistant) {
            console.log(`Found existing assistant: ${existingAssistant.id}`);
            console.log('Updating assistant configuration...');
            await (0, vapi_1.updateAssistant)(existingAssistant.id, assistantConfig);
            console.log('Assistant updated successfully!');
            console.log(`Assistant ID: ${existingAssistant.id}`);
        }
        else {
            console.log('Creating new assistant...');
            const assistantId = await (0, vapi_1.createAssistant)(assistantConfig);
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
    }
    catch (error) {
        console.error('Setup failed:', error);
        process.exit(1);
    }
}
setup();
