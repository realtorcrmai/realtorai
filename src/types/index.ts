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
