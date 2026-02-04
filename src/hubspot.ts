import { Client } from '@hubspot/api-client';
import { config } from './config';
import type { LeadInfo, HubSpotContactProperties } from './types';

const hubspotClient = new Client({ accessToken: config.hubspotApiKey });

export async function createOrUpdateContact(lead: LeadInfo, phoneNumber: string): Promise<string> {
  const properties: HubSpotContactProperties = {
    firstname: lead.firstName,
    lastname: lead.lastName,
    email: lead.email,
    phone: phoneNumber,
    company: lead.company,
    jobtitle: lead.jobTitle,
    hs_lead_status: 'NEW',
  };

  if (lead.eventQuestions) {
    properties.notes = `Event Questions/Interests: ${lead.eventQuestions}`;
  }

  try {
    const existingContact = await findContactByEmail(lead.email);

    if (existingContact) {
      const updated = await hubspotClient.crm.contacts.basicApi.update(existingContact, {
        properties,
      });
      console.log(`Updated HubSpot contact: ${updated.id}`);
      return updated.id;
    }

    const created = await hubspotClient.crm.contacts.basicApi.create({
      properties,
      associations: [],
    });
    console.log(`Created HubSpot contact: ${created.id}`);
    return created.id;
  } catch (error) {
    console.error('Error creating/updating HubSpot contact:', error);
    throw error;
  }
}

async function findContactByEmail(email: string): Promise<string | null> {
  try {
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            },
          ],
        },
      ],
      properties: ['email'],
      limit: 1,
      after: '0',
      sorts: [],
    });

    if (response.results.length > 0) {
      return response.results[0].id;
    }
    return null;
  } catch {
    return null;
  }
}

export async function testHubSpotConnection(): Promise<boolean> {
  try {
    await hubspotClient.crm.contacts.basicApi.getPage(1);
    console.log('HubSpot connection successful');
    return true;
  } catch (error) {
    console.error('HubSpot connection failed:', error);
    return false;
  }
}
