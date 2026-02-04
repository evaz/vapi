import { Client } from '@hubspot/api-client';
import { FilterOperatorEnum } from '@hubspot/api-client/lib/codegen/crm/contacts';
import { config } from './config';
import type { LeadInfo } from './types';

const hubspotClient = config.hubspotApiKey
  ? new Client({ accessToken: config.hubspotApiKey })
  : null;

export function isHubSpotEnabled(): boolean {
  return !!hubspotClient;
}

export async function createOrUpdateContact(lead: LeadInfo, phoneNumber: string): Promise<string | null> {
  if (!hubspotClient) {
    console.log('HubSpot disabled - lead data:', JSON.stringify(lead, null, 2));
    return null;
  }

  const properties: Record<string, string> = {
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
  if (!hubspotClient) {
    return null;
  }

  try {
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'email',
              operator: FilterOperatorEnum.Eq,
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
  if (!hubspotClient) {
    console.log('HubSpot integration disabled');
    return false;
  }

  try {
    await hubspotClient.crm.contacts.basicApi.getPage(1);
    console.log('HubSpot connection successful');
    return true;
  } catch (error) {
    console.error('HubSpot connection failed:', error);
    return false;
  }
}
