import { getContactWebsiteActivity } from "@/actions/website-sessions";
import { WebsiteActivity } from "./WebsiteActivity";

export async function WebsiteActivityLoader({ contactId }: { contactId: string }) {
  const activity = await getContactWebsiteActivity(contactId);
  return <WebsiteActivity activity={activity} />;
}
