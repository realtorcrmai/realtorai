import { google } from "googleapis";

export interface GmailContact {
  resourceName: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
}

/**
 * Fetch contacts from Google People API using OAuth access token.
 * Paginates through all connections (max 2000).
 * API quota: 90 req/min/user. At 200/page, 2000 contacts = 10 requests.
 */
export async function fetchGmailContacts(
  accessToken: string,
  onProgress?: (fetched: number) => void
): Promise<GmailContact[]> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const people = google.people({ version: "v1", auth });
  const contacts: GmailContact[] = [];
  let nextPageToken: string | undefined;

  do {
    const res = await people.people.connections.list({
      resourceName: "people/me",
      pageSize: 200,
      personFields: "names,emailAddresses,phoneNumbers,organizations",
      pageToken: nextPageToken,
      sortOrder: "LAST_NAME_ASCENDING",
    });

    for (const person of res.data.connections || []) {
      contacts.push({
        resourceName: person.resourceName || "",
        name: person.names?.[0]?.displayName || "Unknown",
        email: person.emailAddresses?.[0]?.value || null,
        phone: person.phoneNumbers?.[0]?.value || null,
        company: person.organizations?.[0]?.name || null,
      });
    }

    onProgress?.(contacts.length);
    nextPageToken = res.data.nextPageToken || undefined;
  } while (nextPageToken && contacts.length < 2000);

  return contacts;
}
