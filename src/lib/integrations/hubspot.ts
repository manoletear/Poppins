// HubSpot integration for chatbot leads
// Creates/updates contacts and creates deals
//
// Required env vars:
//   HUBSPOT_ACCESS_TOKEN - Private app access token

const HUBSPOT_BASE = 'https://api.hubapi.com';

function getHeaders(): Record<string, string> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) throw new Error('HUBSPOT_ACCESS_TOKEN not configured');
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

interface ContactInput {
  email: string;
  firstname?: string;
  phone?: string;
  source?: string;
}

// Search for existing contact by email
async function searchContact(email: string): Promise<string | null> {
  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts/search`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      filterGroups: [
        {
          filters: [
            { propertyName: 'email', operator: 'EQ', value: email },
          ],
        },
      ],
      properties: ['email', 'firstname'],
      limit: 1,
    }),
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.results?.[0]?.id || null;
}

// Create or update a HubSpot contact, returns contact ID
export async function createOrUpdateHubSpotContact(
  input: ContactInput
): Promise<string | null> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    console.warn('HUBSPOT_ACCESS_TOKEN not set, skipping HubSpot sync');
    return null;
  }

  // Check if contact exists
  const existingId = await searchContact(input.email);

  const properties: Record<string, string> = {
    email: input.email,
  };
  if (input.firstname) properties.firstname = input.firstname;
  if (input.phone) properties.phone = input.phone;
  if (input.source) properties.hs_lead_status = 'NEW';

  if (existingId) {
    // Update existing contact
    const res = await fetch(
      `${HUBSPOT_BASE}/crm/v3/objects/contacts/${existingId}`,
      {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify({ properties }),
      }
    );
    if (!res.ok) {
      console.error('HubSpot update error:', await res.text());
    }
    return existingId;
  }

  // Create new contact
  properties.lifecyclestage = 'lead';
  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/contacts`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ properties }),
  });

  if (!res.ok) {
    console.error('HubSpot create contact error:', await res.text());
    return null;
  }

  const data = await res.json();
  return data.id;
}

interface DealInput {
  contactId: string;
  dealName: string;
  pipeline?: string;
  stage?: string;
}

// Create a deal and associate it with a contact
export async function createHubSpotDeal(input: DealInput): Promise<string | null> {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) return null;

  const res = await fetch(`${HUBSPOT_BASE}/crm/v3/objects/deals`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      properties: {
        dealname: input.dealName,
        pipeline: input.pipeline || 'default',
        dealstage: input.stage || 'appointmentscheduled',
        amount: '24770',
        deal_currency_code: 'CLP',
      },
      associations: [
        {
          to: { id: input.contactId },
          types: [
            {
              associationCategory: 'HUBSPOT_DEFINED',
              associationTypeId: 3, // deal-to-contact
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    console.error('HubSpot create deal error:', await res.text());
    return null;
  }

  const data = await res.json();
  return data.id;
}
