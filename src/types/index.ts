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
export type User = Database["public"]["Tables"]["users"]["Row"];
export type UserInsert = Database["public"]["Tables"]["users"]["Insert"];
export type ContactDate = Database["public"]["Tables"]["contact_dates"]["Row"];
export type ContactDateInsert = Database["public"]["Tables"]["contact_dates"]["Insert"];
export type ContactDocument = Database["public"]["Tables"]["contact_documents"]["Row"];
export type ContactDocumentInsert = Database["public"]["Tables"]["contact_documents"]["Insert"];

export type FamilyMember = {
  name: string;
  relationship: string;
  phone?: string;
  email?: string;
};

export type PropertyOfInterest = {
  id: string;
  listing_id?: string;
  address: string;
  price?: number;
  notes?: string;
  added_at: string;
};

export type BuyerPreferences = {
  price_range_min?: number;
  price_range_max?: number;
  bedrooms?: number;
  bathrooms?: number;
  property_types?: string[];
  preferred_areas?: string[];
  move_in_timeline?: string;
  notes?: string;
  pre_approval_amount?: number;
  properties_of_interest?: PropertyOfInterest[];
  must_haves?: string[];
  nice_to_haves?: string[];
  financing_status?: 'not_started' | 'in_progress' | 'preapproved';
};

export interface SellerPreferences {
  motivation?: string; // relocating, upsizing, downsizing, investment, estate, other
  desired_list_price?: number;
  earliest_list_date?: string; // ISO date
  occupancy?: string; // owner_occupied, tenant, vacant
  has_purchase_plan_after_sale?: boolean;
  notes?: string;
}

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

export type AppointmentWithDetails = Appointment & {
  listings: (Listing & { contacts: Contact | null }) | null;
};

export type ContactWithCounts = Contact & {
  listings: { id: string }[];
  deals: { id: string }[];
  communications: { id: string }[];
};

export type ListingWithDetails = Listing & {
  contacts: Contact;
  prompts?: Prompt | null;
  media_assets?: MediaAsset[];
};

// Workflow Automation types
export type MessageTemplate = Database["public"]["Tables"]["message_templates"]["Row"];
export type MessageTemplateInsert = Database["public"]["Tables"]["message_templates"]["Insert"];
export type Workflow = Database["public"]["Tables"]["workflows"]["Row"];
export type WorkflowInsert = Database["public"]["Tables"]["workflows"]["Insert"];
export type WorkflowStep = Database["public"]["Tables"]["workflow_steps"]["Row"];
export type WorkflowStepInsert = Database["public"]["Tables"]["workflow_steps"]["Insert"];
export type WorkflowEnrollment = Database["public"]["Tables"]["workflow_enrollments"]["Row"];
export type WorkflowEnrollmentInsert = Database["public"]["Tables"]["workflow_enrollments"]["Insert"];
export type WorkflowStepLog = Database["public"]["Tables"]["workflow_step_logs"]["Row"];
export type AgentNotification = Database["public"]["Tables"]["agent_notifications"]["Row"];
export type ActivityLog = Database["public"]["Tables"]["activity_log"]["Row"];
export type Referral = Database["public"]["Tables"]["referrals"]["Row"];
export type ReferralInsert = Database["public"]["Tables"]["referrals"]["Insert"];
export type Household = Database["public"]["Tables"]["households"]["Row"];
export type HouseholdInsert = Database["public"]["Tables"]["households"]["Insert"];
export type ContactRelationship = Database["public"]["Tables"]["contact_relationships"]["Row"];
export type ContactRelationshipInsert = Database["public"]["Tables"]["contact_relationships"]["Insert"];

export type Demographics = {
  birthday?: string;
  anniversary?: string;
  occupation?: string;
  employer?: string;
  income_range?: string;
  languages?: string[];
  hobbies_interests?: string[];
  family_size?: number;
  bio_notes?: string;
};

export type WorkflowWithSteps = Workflow & {
  workflow_steps: WorkflowStep[];
};

export type EnrollmentWithWorkflow = WorkflowEnrollment & {
  workflows: Workflow;
  contacts: { id: string; name: string };
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
      role?: "admin" | "realtor";
      enabledFeatures?: string[];
    };
  }
}

// JWT type augmentation handled in auth.ts via callback
