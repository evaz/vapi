# Vapi SMS Agent + HubSpot Integration

An SMS-based conversational agent that collects event questions and lead information via text message, then automatically syncs contacts to HubSpot.

## Features

- Natural SMS conversation flow
- Collects: name, email, company, job title, event questions
- Automatic HubSpot contact creation/update
- Render.com deployment ready

## Prerequisites

1. **Vapi Account**: Sign up at [vapi.ai](https://vapi.ai) and get your API key
2. **HubSpot Account**: Create a Private App in HubSpot with `crm.objects.contacts.write` and `crm.objects.contacts.read` scopes

## Local Development

1. Clone the repository:
   ```bash
   git clone <your-repo-url>
   cd vapi-hubspot-agent
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create `.env` file:
   ```bash
   cp .env.example .env
   ```

4. Fill in your API keys in `.env`:
   ```
   VAPI_API_KEY=your_vapi_api_key
   HUBSPOT_API_KEY=your_hubspot_private_app_token
   WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
   EVENT_NAME=Tech Conference 2024
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

6. Use ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```

7. Update `WEBHOOK_BASE_URL` in `.env` with your ngrok URL

8. Set up the Vapi assistant:
   ```bash
   npm run setup
   ```

## Deploy to Render.com

1. Push your code to GitHub

2. Go to [Render Dashboard](https://dashboard.render.com)

3. Click "New" → "Blueprint"

4. Connect your GitHub repository

5. Render will detect `render.yaml` and configure the service

6. Add environment variables in Render:
   - `VAPI_API_KEY`
   - `HUBSPOT_API_KEY`
   - `WEBHOOK_BASE_URL` (your Render URL, e.g., `https://vapi-hubspot-agent.onrender.com`)
   - `EVENT_NAME` (optional)

7. Deploy!

8. Run the setup script locally with your Render URL:
   ```bash
   WEBHOOK_BASE_URL=https://your-app.onrender.com npm run setup
   ```

## Vapi Phone Number Setup

After deploying:

1. Go to [Vapi Dashboard](https://dashboard.vapi.ai)
2. Navigate to **Phone Numbers**
3. Buy or import a phone number
4. Assign the **"Event Lead Collector"** assistant to the number
5. Enable SMS for the phone number
6. Test by texting your Vapi number!

## API Endpoints

- `GET /health` - Health check
- `POST /vapi/webhook` - Vapi webhook handler

## Conversation Flow

1. User texts the Vapi number
2. Assistant greets and asks for name
3. Collects email, company, job title
4. Asks about event questions/interests
5. Saves lead to HubSpot
6. Confirms and offers additional help

## HubSpot Field Mapping

| Collected | HubSpot Property |
|-----------|------------------|
| First Name | `firstname` |
| Last Name | `lastname` |
| Email | `email` |
| Phone | `phone` |
| Company | `company` |
| Job Title | `jobtitle` |
| Event Questions | `notes` |

## Troubleshooting

**HubSpot connection failed**: Check your Private App token has the correct scopes

**Vapi webhook not receiving**: Verify your `WEBHOOK_BASE_URL` is correct and the server is accessible

**Assistant not responding**: Check the Vapi dashboard for error logs
# vapi
# vapi
# vapi
