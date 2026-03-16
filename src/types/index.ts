import type { Database } from "./database";

export type Contact = Database["public"]["Tables"]["contacts"]["Row"];
export type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];
export type Listing = Database["public"]["Tables"]["listings"]["Row"];
export type ListingInsert = Database["public"]["Tables"]["listings"]["Insert"];
export type Appointment = Database["public"]["Tables"]["appointments"]["Row"];
export type AppointmentInsert = Database["public"]["Tables"]["appointments"]["Insert"];
export type Communication = Database["public"]["Tables"]["communications"]["Row"];
export type ListingDocument = Database["public"]["Tables"]["listing_documents"]["Row"];
export type FormTemplate = Database["public"]["Tables"]["form_templates"]["Row"];
export type FormSubmission = Database["public"]["Tables"]["form_submissions"]["Row"];
export type Deal = Database["public"]["Tables"]["deals"]["Row"];
export type DealInsert = Database["public"]["Tables"]["deals"]["Insert"];
export type DealParty = Database["public"]["Tables"]["deal_parties"]["Row"];
export type DealPartyInsert = Database["public"]["Tables"]["deal_parties"]["Insert"];
export type DealChecklist = Database["public"]["Tables"]["deal_checklist"]["Row"];
export type DealChecklistInsert = Database["public"]["Tables"]["deal_checklist"]["Insert"];
export type Mortgage = Database["public"]["Tables"]["mortgages"]["Row"];
export type MortgageInsert = Database["public"]["Tables"]["mortgages"]["Insert"];
export type ContactFamilyMember = Database["public"]["Tables"]["contact_family_members"]["Row"];
export type ContactImportantDate = Database["public"]["Tables"]["contact_important_dates"]["Row"];
export type OpenHouse = Database["public"]["Tables"]["open_houses"]["Row"];
export type OpenHouseVisitor = Database["public"]["Tables"]["open_house_visitors"]["Row"];
export type ListingActivity = Database["public"]["Tables"]["listing_activities"]["Row"];
export type UserIntegration = Database["public"]["Tables"]["user_integrations"]["Row"];
export type UserIntegrationInsert = Database["public"]["Tables"]["user_integrations"]["Insert"];
export type Prompt = Database["public"]["Tables"]["prompts"]["Row"];
export type PromptInsert = Database["public"]["Tables"]["prompts"]["Insert"];
export type MediaAsset = Database["public"]["Tables"]["media_assets"]["Row"];
export type MediaAssetInsert = Database["public"]["Tables"]["media_assets"]["Insert"];

export type DealWithRelations = Deal & {
  contacts: Contact | null;
  listings: Listing | null;
};

export type AppointmentWithListing = Appointment & {
  listings: Listing;
};

export type ListingWithSeller = Listing & {
  contacts: Contact;
};

// NextAuth session augmentation
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      accessToken?: string;
    };
  }
}

// JWT type augmentation handled in auth.ts via callback
